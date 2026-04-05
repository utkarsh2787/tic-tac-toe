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

function recordResult(
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger,
  winnerId: string | null,
  allPlayerIds: string[],
  streaks: { [userId: string]: number }
): void {
  try {
    if (winnerId && winnerId !== "draw") {
      nk.leaderboardRecordWrite(
        LEADERBOARD_WINS,
        winnerId,
        "",
        1,
        0,
        {}
      );
      var newStreak = (streaks[winnerId] || 0) + 1;
      nk.leaderboardRecordWrite(
        LEADERBOARD_STREAKS,
        winnerId,
        "",
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
          "",
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
