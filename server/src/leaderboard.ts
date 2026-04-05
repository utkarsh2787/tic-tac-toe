function createLeaderboards(
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger
): void {
  try {
    nk.leaderboardCreate(
      LEADERBOARD_WINS,
      true,
      nkruntime.SortOrder.DESCENDING,
      nkruntime.Operator.INCREMENTAL,
      null,
      null,
      false
    );
    nk.leaderboardCreate(
      LEADERBOARD_LOSSES,
      true,
      nkruntime.SortOrder.DESCENDING,
      nkruntime.Operator.INCREMENTAL,
      null,
      null,
      false
    );
    nk.leaderboardCreate(
      LEADERBOARD_STREAKS,
      true,
      nkruntime.SortOrder.DESCENDING,
      nkruntime.Operator.BEST,
      null,
      null,
      false
    );
    logger.info("Leaderboards created successfully.");
  } catch (e) {
    logger.warn("Leaderboard creation skipped (may already exist): " + e);
  }
}

function getUsernames(
  nk: nkruntime.Nakama,
  userIds: string[]
): { [userId: string]: string } {
  var result: { [userId: string]: string } = {};
  try {
    var users = nk.usersGetId(userIds);
    for (var i = 0; i < users.length; i++) {
      result[users[i].userId] = users[i].username || users[i].userId.slice(0, 8);
    }
  } catch (e) {
    // fallback: use userId slice
    for (var j = 0; j < userIds.length; j++) {
      result[userIds[j]] = userIds[j].slice(0, 8);
    }
  }
  return result;
}

function recordResult(
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger,
  winnerId: string | null,
  allPlayerIds: string[],
  streaks: { [userId: string]: number }
): void {
  try {
    var usernames = getUsernames(nk, allPlayerIds);

    if (winnerId && winnerId !== "draw") {
      nk.leaderboardRecordWrite(
        LEADERBOARD_WINS,
        winnerId,
        usernames[winnerId] || "",
        1,
        0,
        {}
      );
      var newStreak = (streaks[winnerId] || 0) + 1;
      nk.leaderboardRecordWrite(
        LEADERBOARD_STREAKS,
        winnerId,
        usernames[winnerId] || "",
        newStreak,
        0,
        {}
      );
      streaks[winnerId] = newStreak;
    }

    for (var i = 0; i < allPlayerIds.length; i++) {
      var uid = allPlayerIds[i];
      if (uid !== winnerId) {
        nk.leaderboardRecordWrite(
          LEADERBOARD_LOSSES,
          uid,
          usernames[uid] || "",
          1,
          0,
          {}
        );
        streaks[uid] = 0;
      }
    }
  } catch (e) {
    logger.error("Failed to record leaderboard result: " + e);
  }
}
