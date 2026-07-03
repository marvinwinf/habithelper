# User Model

## Initial Model

The MVP is designed for one individual user on one Android device.

The app does not require:

- registration,
- authentication,
- multiple local users,
- public profiles,
- social connections,
- shared routines,
- leaderboards,
- group challenges.

## Local Profile

The app may create one internal local profile automatically.

The profile can store:

- stable profile ID,
- display name,
- creation timestamp,
- settings.

The profile must not expose unnecessary account-management UI.

## Future Extensibility

The data model should not prevent later support for:

- optional user accounts,
- cloud backup,
- cross-device synchronization,
- device migration,
- multiple profiles.

Future extensibility must come from stable identifiers and clean ownership boundaries, not premature multi-user complexity.
