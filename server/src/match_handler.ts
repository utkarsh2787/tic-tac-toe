var matchInit: nkruntime.MatchInitFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  params: { [key: string]: string }
) {
  var label: MatchLabel = { open: 1, fast: 0 };
  if (params["fast"] === "1") {
    label.fast = 1;
  }

  var state: MatchState = {
    label: label,
    board: buildEmptyBoard(),
    marks: {},
    presences: {},
    joinsInProgress: 0,
    playing: false,
    currentTurn: "",
    deadlineTick: 0,
    emptyTicks: 0,
    winner: null,
    streaks: {},
  };

  return {
    state: state,
    tickRate: TICK_RATE,
    label: JSON.stringify(label),
  };
};

var matchJoinAttempt: nkruntime.MatchJoinAttemptFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  presence: nkruntime.Presence,
  metadata: { [key: string]: any }
) {
  var s = state as MatchState;

  // Allow reconnect if player already has a mark
  if (s.marks[presence.userId]) {
    return { state: s, accept: true };
  }

  // Reject if at capacity
  if (Object.keys(s.presences).length + s.joinsInProgress >= 2) {
    return { state: s, accept: false, rejectMessage: "match is full" };
  }

  // Reject if game already in progress (no new players)
  if (s.playing) {
    return { state: s, accept: false, rejectMessage: "game already in progress" };
  }

  s.joinsInProgress++;
  return { state: s, accept: true };
};

var matchJoin: nkruntime.MatchJoinFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  presences: nkruntime.Presence[]
) {
  var s = state as MatchState;

  for (var i = 0; i < presences.length; i++) {
    var p = presences[i];
    s.presences[p.userId] = p;
    if (s.joinsInProgress > 0) {
      s.joinsInProgress--;
    }
  }

  var playerIds = Object.keys(s.presences);

  // Start game when two players are present
  if (playerIds.length === 2 && !s.playing) {
    s.playing = true;
    s.marks[playerIds[0]] = "x";
    s.marks[playerIds[1]] = "o";
    s.currentTurn = playerIds[0];
    s.deadlineTick = tick + TURN_TICKS;
    s.label.open = 0;

    dispatcher.matchLabelUpdate(JSON.stringify(s.label));

    var startPayload: StartPayload = {
      marks: s.marks,
      currentTurn: s.currentTurn,
      deadline: Math.floor(s.deadlineTick / TICK_RATE),
    };
    dispatcher.broadcastMessage(
      OpCode.START,
      JSON.stringify(startPayload),
      null,
      null,
      true
    );
  } else if (s.playing) {
    // Reconnect: send current board state
    var reconnectPresences = presences;
    var updatePayload: UpdatePayload = {
      board: s.board,
      currentTurn: s.currentTurn,
      deadline: Math.floor(s.deadlineTick / TICK_RATE),
    };
    dispatcher.broadcastMessage(
      OpCode.UPDATE,
      JSON.stringify(updatePayload),
      reconnectPresences,
      null,
      true
    );
  }

  return { state: s };
};

var matchLeave: nkruntime.MatchLeaveFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  presences: nkruntime.Presence[]
) {
  var s = state as MatchState;

  for (var i = 0; i < presences.length; i++) {
    delete s.presences[presences[i].userId];
  }

  if (Object.keys(s.presences).length > 0 && s.playing) {
    dispatcher.broadcastMessage(
      OpCode.OPPONENT_LEFT,
      null,
      null,
      null,
      true
    );
  }

  return { state: s };
};

var matchLoop: nkruntime.MatchLoopFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  messages: nkruntime.MatchMessage[]
) {
  var s = state as MatchState;
  var presenceCount = Object.keys(s.presences).length;

  // Terminate if empty too long
  if (presenceCount === 0) {
    s.emptyTicks++;
    if (s.emptyTicks >= EMPTY_TIMEOUT_TICKS) {
      return null;
    }
    return { state: s };
  }
  s.emptyTicks = 0;

  if (!s.playing) {
    return { state: s };
  }

  // Process incoming messages
  for (var i = 0; i < messages.length; i++) {
    var msg = messages[i];

    if (msg.opCode !== ClientOpCode.MOVE) {
      continue;
    }

    // Reject if not the active player
    if (msg.sender.userId !== s.currentTurn) {
      var senderPresence = s.presences[msg.sender.userId];
      if (senderPresence) {
        dispatcher.broadcastMessage(
          OpCode.REJECTED,
          JSON.stringify({ reason: "not your turn" }),
          [senderPresence],
          null,
          true
        );
      }
      continue;
    }

    var move: MovePayload;
    try {
      move = JSON.parse(nk.binaryToString(msg.data));
    } catch (e) {
      logger.warn("Failed to parse move payload: " + e);
      continue;
    }

    if (!validateMove(s.board, move.position)) {
      var senderPresence2 = s.presences[msg.sender.userId];
      if (senderPresence2) {
        dispatcher.broadcastMessage(
          OpCode.REJECTED,
          JSON.stringify({ reason: "invalid move" }),
          [senderPresence2],
          null,
          true
        );
      }
      continue;
    }

    // Apply the move
    s.board[move.position] = s.marks[msg.sender.userId];

    var winMark = checkWinner(s.board);
    var draw = !winMark && isBoardFull(s.board);

    if (winMark || draw) {
      var winnerId: string | null = null;
      var winnerMark: string | null = null;

      if (winMark) {
        var playerIds = Object.keys(s.marks);
        for (var j = 0; j < playerIds.length; j++) {
          if (s.marks[playerIds[j]] === winMark) {
            winnerId = playerIds[j];
            winnerMark = winMark;
            break;
          }
        }
      } else {
        winnerId = "draw";
      }

      s.winner = winnerId;
      s.playing = false;

      var allPlayerIds = Object.keys(s.presences);
      recordResult(nk, logger, winnerId, allPlayerIds, s.streaks);

      var donePayload: DonePayload = {
        board: s.board,
        winner: winnerId,
        winnerMark: winnerMark,
      };
      dispatcher.broadcastMessage(
        OpCode.DONE,
        JSON.stringify(donePayload),
        null,
        null,
        true
      );
      return null;
    }

    // Advance turn to the other player
    var allIds = Object.keys(s.marks);
    for (var k = 0; k < allIds.length; k++) {
      if (allIds[k] !== msg.sender.userId) {
        s.currentTurn = allIds[k];
        break;
      }
    }
    s.deadlineTick = tick + TURN_TICKS;

    var updatePayload: UpdatePayload = {
      board: s.board,
      currentTurn: s.currentTurn,
      deadline: Math.floor(s.deadlineTick / TICK_RATE),
    };
    dispatcher.broadcastMessage(
      OpCode.UPDATE,
      JSON.stringify(updatePayload),
      null,
      null,
      true
    );
  }

  // Send timer tick every second (every TICK_RATE ticks)
  if (tick % TICK_RATE === 0) {
    var remaining = Math.max(
      0,
      Math.floor((s.deadlineTick - tick) / TICK_RATE)
    );
    var timerPayload: TimerTickPayload = { remaining: remaining };
    dispatcher.broadcastMessage(
      OpCode.TIMER_TICK,
      JSON.stringify(timerPayload),
      null,
      null,
      true
    );
  }

  // Enforce timer: forfeit if deadline exceeded
  if (s.deadlineTick > 0 && tick >= s.deadlineTick) {
    var forfeitedId = s.currentTurn;
    var remainingPlayers = Object.keys(s.presences).filter(function (uid) {
      return uid !== forfeitedId;
    });

    var timeoutWinnerId: string | null =
      remainingPlayers.length > 0 ? remainingPlayers[0] : "draw";
    var timeoutWinnerMark: string | null =
      timeoutWinnerId && timeoutWinnerId !== "draw"
        ? s.marks[timeoutWinnerId] || null
        : null;

    s.winner = timeoutWinnerId;
    s.playing = false;

    var allIds2 = Object.keys(s.presences);
    recordResult(nk, logger, timeoutWinnerId, allIds2, s.streaks);

    var timeoutDonePayload: DonePayload = {
      board: s.board,
      winner: timeoutWinnerId,
      winnerMark: timeoutWinnerMark,
    };
    dispatcher.broadcastMessage(
      OpCode.DONE,
      JSON.stringify(timeoutDonePayload),
      null,
      null,
      true
    );
    return null;
  }

  return { state: s };
};

var matchTerminate: nkruntime.MatchTerminateFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  graceSeconds: number
) {
  var s = state as MatchState;
  var terminatePayload: DonePayload = {
    board: s.board,
    winner: null,
    winnerMark: null,
  };
  dispatcher.broadcastMessage(
    OpCode.DONE,
    JSON.stringify(terminatePayload),
    null,
    null,
    true
  );
  return { state: s };
};

var matchSignal: nkruntime.MatchSignalFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  data: string
) {
  logger.info("Match signal received: " + data);
  return { state: state, data: "ack" };
};
