# Routine Rules

## Routine Types

A routine can use one of these schedules:

1. Daily.
2. Selected weekdays.
3. A target number of completions per week.

Weekly-target routines receive suggested weekdays that the user can change.

## Routine Fields

Required or visible fields:

- name,
- category,
- frequency,
- optional time.

Additional settings:

- personal reason,
- whether conscious skipping is allowed.

A routine starts immediately when created.

## Completion States

A routine occurrence can become:

- completed,
- exceeded,
- consciously skipped,
- missed,
- protected by joker,
- paused,
- moved.

Normal completion and exceeded completion each count as one successful completion.

Exceeded completion receives a stronger animation but no additional streak or level progress.

## Undo Completion

A misclicked completed or exceeded occurrence can be undone back to pending by tapping its completion control again.

Undoing recalculates the routine's streak, level, and joker progress as if the completion never happened — including any joker earned by that same completion, which is un-earned along with it.

If the undone occurrence was the day's only actual completion, the overall app streak reverts too. If another occurrence was completed the same day, the app streak is unaffected.

Undo is only offered for the current day's occurrence, not for past history — retroactive edits to past days remain a separate concern (see Retroactive Completion below).

## Retroactive Completion

Past occurrences can be marked as completed later.

Retroactive completion must use the original occurrence date and trigger a full recalculation of streaks, jokers, and progress.

If a joker was previously consumed for that occurrence, the joker must be restored.

## Move to Tomorrow

A planned occurrence can be moved to tomorrow.

The original occurrence is not treated as missed. If the moved occurrence is not completed on the new date, normal missed-occurrence rules apply.

## Conscious Skip

Conscious skipping is optional per routine.

When allowed, conscious skipping:

- does not count as successful completion,
- does not break the routine streak,
- does not consume a joker,
- does not count as a missed occurrence,
- may include an optional reason.

## Pause

Pausing a routine:

- removes it from active daily planning,
- freezes the active streak,
- preserves history,
- preserves level rank,
- preserves total completions.

Reactivation continues from the preserved state.

## Routine Streak

The routine streak counts consecutive successful planned occurrences.

Non-scheduled days do not change the streak.

For weekly-target routines, each successful completion increases the streak by one. Once the weekly target is reached, the routine remains visibly completed for the rest of the week.

## Overall App Streak

The overall app streak increases when at least one routine is actually completed on a calendar day.

Tasks do not count.

Focus sessions do not count.

A day with no scheduled routines does not break the overall app streak.

Conscious skips and joker protection do not count as an actual completion for the overall app streak.

## Joker Rules Before 66

Before a routine streak reaches 66:

- one joker is earned after every 5 successful completions,
- maximum joker inventory is 2,
- joker progress resets after earning a joker,
- jokers are used automatically,
- one joker protects one missed occurrence,
- retroactive completion restores a consumed joker.

Conscious skips and pauses do not reset joker-earning progress.

## Protection After 66

After a routine streak reaches 66:

- normal jokers are no longer used for that routine,
- up to 3 consecutive missed planned occurrences are tolerated,
- the fourth consecutive missed planned occurrence resets the current streak to 0,
- conscious skips, pauses, and moved occurrences do not count as missed,
- the achieved level rank and total history remain preserved,
- enhanced protection becomes available again only after the current streak reaches 66 again.

## Levels

Each routine has its own level progression.

Each level segment uses 66 successful completions.

Visible level names:

- Im Aufbau,
- Stabil,
- Gefestigt,
- Meister.

Level rank and total successful completions remain preserved even if the current streak resets.
