var rpcFindMatch: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  if (!ctx.userId) {
    throw Error("No user context");
  }

  var req: { fast?: boolean } = {};
  try {
    if (payload) {
      req = JSON.parse(payload);
    }
  } catch (e) {
    // use defaults
  }

  // Query for open matches (label.open:1, 0–1 players already present)
  var matches: nkruntime.Match[] = [];
  try {
    matches = nk.matchList(10, true, null, 0, 1, "label.open:1");
  } catch (e) {
    logger.warn("matchList failed: " + e);
  }

  if (matches.length > 0) {
    return JSON.stringify({ matchId: matches[0].matchId });
  }

  // No open match found — create one
  var params: { [key: string]: string } = {};
  if (req.fast) {
    params["fast"] = "1";
  }

  var matchId = nk.matchCreate(MODULE_NAME, params);
  return JSON.stringify({ matchId: matchId });
};

var rpcGetLeaderboard: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  if (!ctx.userId) {
    throw Error("No user context");
  }

  var limit = 10;
  var req: { limit?: number } = {};
  try {
    if (payload) {
      req = JSON.parse(payload);
      if (req.limit && req.limit > 0 && req.limit <= 100) {
        limit = req.limit;
      }
    }
  } catch (e) {
    // use defaults
  }

  var result = nk.leaderboardRecordsList(
    LEADERBOARD_WINS,
    [],
    limit,
    "",
    0
  );

  return JSON.stringify(result);
};
