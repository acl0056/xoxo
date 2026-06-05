# Requirements Document

## Introduction

This document defines the requirements for the auto-update feature in the xoxo Electron desktop application. The feature enables the app to automatically check for new versions published to GitHub Releases, download updates in the background, and prompt the user to restart to apply updates. Requirements are derived from the approved design document and follow EARS patterns with INCOSE quality standards.

## Glossary

- **AutoUpdater**: The main process module that wraps `electron-updater` and manages the update lifecycle including checking, downloading, and installing updates.
- **IPC_Bridge**: The inter-process communication layer that passes update status messages between the Electron main process and the renderer process.
- **Renderer**: The Electron renderer process that displays the application UI and toast notifications to the user.
- **Toast_Notification**: A non-blocking UI notification displayed to the user via vue-toastification.
- **Update_Menu_Item**: The "Check for Updates..." entry in the application Help menu.
- **GitHub_Releases**: The remote update provider where platform-specific artifacts and metadata files are published.
- **UpdateStatus**: The internal state of the updater, one of: idle, checking, available, downloading, downloaded, or error.

## Requirements

### Requirement 1: Startup Update Check

**User Story:** As a user, I want the app to automatically check for updates shortly after launch, so that I am informed of new versions without manual effort.

#### Acceptance Criteria

1. WHEN the application reaches the ready state, THE AutoUpdater SHALL schedule an update check after a 10-second delay
2. WHEN the delayed startup check fires, THE AutoUpdater SHALL query GitHub_Releases for a newer version
3. WHILE the startup check is pending, THE AutoUpdater SHALL execute the update check asynchronously such that it does not add latency to window rendering or block user interaction
4. IF the application is quit before the 10-second delay elapses, THEN THE AutoUpdater SHALL cancel the pending timer without triggering the update check or raising an error
5. IF the startup update check fails due to a network error or unreachable server, THEN THE AutoUpdater SHALL log the error, send an update-error event to the renderer, and remain in a state that permits the next scheduled or manual check to proceed

### Requirement 2: Periodic Update Checks

**User Story:** As a user, I want the app to periodically check for updates in the background, so that I receive timely notification of new versions during long sessions.

#### Acceptance Criteria

1. WHEN an update check completes (success or failure), THE AutoUpdater SHALL cancel any existing periodic timer and schedule exactly one next check after a 4-hour interval
2. THE AutoUpdater SHALL maintain at most one pending periodic timer at any time to prevent duplicate scheduled checks
3. IF a periodic timer fires while an update check is already in progress, THEN THE AutoUpdater SHALL skip the redundant check and reschedule the next periodic timer after a 4-hour interval
4. WHEN the application remains running beyond 4 hours, THE AutoUpdater SHALL perform a background check that does not display modal dialogs, block user input, or freeze the renderer process
5. WHEN the system resumes from sleep or suspend, THE AutoUpdater SHALL schedule an immediate update check if more than 4 hours have elapsed since the last completed check

### Requirement 3: Manual Update Check

**User Story:** As a user, I want to manually trigger an update check from the menu, so that I can verify I have the latest version on demand.

#### Acceptance Criteria

1. THE Update_Menu_Item SHALL appear in the application Help menu with the label "Check for Updates..."
2. WHEN the user clicks the Update_Menu_Item, THE AutoUpdater SHALL query GitHub_Releases for a newer version without artificial delay
3. WHEN no update is available after a manual check, THE Renderer SHALL display a Toast_Notification indicating the user is on the latest version
4. WHILE the updater status is "checking" or "downloading", THE Update_Menu_Item SHALL be disabled to prevent concurrent checks, and SHALL be re-enabled when the status transitions to "idle", "available", "downloaded", or "error"
5. WHEN the updater status changes, THE Update_Menu_Item label SHALL update according to the following mapping: "checking" displays "Checking...", "downloaded" displays "Restart to Update", and all other statuses ("idle", "available", "downloading", "error") display "Check for Updates..."
6. IF a manual update check fails due to a network error or other failure, THEN THE Renderer SHALL display a Toast_Notification indicating that the update check failed, and THE AutoUpdater SHALL return to the "idle" status so the user can retry

### Requirement 4: Update Download

**User Story:** As a user, I want updates to download automatically in the background, so that I can continue working while the update prepares.

#### Acceptance Criteria

1. WHEN an update is detected as available, THE AutoUpdater SHALL begin downloading the update automatically without blocking the Renderer process
2. WHILE a download is in progress, THE AutoUpdater SHALL send progress information to the Renderer via the IPC_Bridge including percent (0 to 100), bytesPerSecond (0 or greater), transferred bytes (less than or equal to total), and total bytes
3. WHEN the download completes, THE AutoUpdater SHALL notify the Renderer via the IPC_Bridge with the update version, release notes, and release date
4. THE AutoUpdater SHALL use differential downloads via .blockmap files when available to reduce the download size compared to a full binary download
5. IF the download fails due to a network error or file corruption, THEN THE AutoUpdater SHALL send an error notification to the Renderer via the IPC_Bridge and SHALL retry the download on the next scheduled or manual update check
6. IF the download is interrupted due to a network disconnection, THEN THE AutoUpdater SHALL resume the partial download from where it left off when connectivity is restored or on the next update check

### Requirement 5: Update Notification and Installation

**User Story:** As a user, I want to be notified when an update is ready and choose when to restart, so that I do not lose unsaved work.

#### Acceptance Criteria

1. WHEN an update is available, THE Renderer SHALL display an informational Toast_Notification with the new version number
2. WHEN the download completes, THE Renderer SHALL display a persistent Toast_Notification showing the new version number with "Restart Now" and "Later" action buttons that remains visible until the user selects an action
3. WHEN the user clicks "Restart Now", THE AutoUpdater SHALL quit the application and install the update
4. WHEN the user clicks "Later", THE Renderer SHALL dismiss the prompt and suppress it until the next application launch
5. IF the UpdateStatus is not "downloaded" when quitAndInstall is invoked, THEN THE AutoUpdater SHALL reject the request without quitting the application
6. IF the update download fails, THEN THE Renderer SHALL display a dismissible error Toast_Notification indicating that the download failed

### Requirement 6: IPC Communication

**User Story:** As a developer, I want a well-defined IPC contract between main and renderer processes, so that update status is communicated reliably and predictably.

#### Acceptance Criteria

1. WHEN the AutoUpdater detects an available update, THE IPC_Bridge SHALL send an "update-available" message containing version as a semantic version string, releaseNotes as a string or null, and releaseDate as an ISO 8601 date string
2. WHEN no update is available, THE IPC_Bridge SHALL send an "update-not-available" message containing the current application version as a semantic version string
3. WHILE a download is in progress, THE IPC_Bridge SHALL send "update-download-progress" messages with percent as a number in the range 0 to 100, transferred as a number less than or equal to total, total as a number greater than 0, and bytesPerSecond as a number greater than or equal to 0
4. WHEN a download completes, THE IPC_Bridge SHALL send an "update-downloaded" message containing version as a semantic version string, releaseNotes as a string or null, and releaseDate as an ISO 8601 date string
5. WHEN an error occurs during update check or download, THE IPC_Bridge SHALL send an "update-error" message containing a non-empty descriptive message string indicating the failure reason and an error code string identifying the error category
6. THE IPC_Bridge SHALL send a corresponding IPC message to the Renderer for each autoUpdater event including checking-for-update, update-available, update-not-available, download-progress, update-downloaded, and error, without dropping any event
7. IF the target BrowserWindow is destroyed or unavailable when an IPC message would be sent, THEN THE IPC_Bridge SHALL discard the message without throwing an error

### Requirement 7: State Machine Integrity

**User Story:** As a developer, I want the updater to follow a valid state machine, so that the system behavior is predictable and debuggable.

#### Acceptance Criteria

1. THE AutoUpdater SHALL transition through states only in the following valid sequences: idle to checking to available to downloading to downloaded, or idle to checking to idle (no update available), or any state to error (on failure), or error to checking (on the next scheduled check or manual check invocation)
2. THE AutoUpdater SHALL NOT skip intermediate states during transitions
3. THE UpdateStatus SHALL always hold one of the defined values: idle, checking, available, downloading, downloaded, or error
4. IF an action is invoked that would cause a transition not listed in the valid sequences, THEN THE AutoUpdater SHALL ignore the action and remain in the current state

### Requirement 8: Error Handling - Network Failure

**User Story:** As a user, I want the app to handle network failures gracefully during update checks, so that my experience is not disrupted when offline.

#### Acceptance Criteria

1. IF a network failure occurs during an update check, THEN THE AutoUpdater SHALL log the error details and send an "update-error" message to the Renderer containing a user-friendly message and error code
2. IF a network failure occurs during an update check, THEN THE AutoUpdater SHALL schedule the next periodic check after the standard 4-hour interval
3. IF a network failure occurs during an update check, THEN THE AutoUpdater SHALL transition the UpdateStatus to "idle" so that subsequent manual or scheduled checks can proceed
4. IF a network failure occurs during an update check, THEN THE AutoUpdater SHALL NOT crash, hang, or become unresponsive

### Requirement 9: Error Handling - Code Signing (macOS)

**User Story:** As a macOS user running a development build, I want the app to handle code signing verification failures without crashing, so that the app remains functional even when auto-update cannot work.

#### Acceptance Criteria

1. IF a code signing verification failure occurs on macOS, THEN THE AutoUpdater SHALL log a warning and send an "update-error" message indicating that the app is not code-signed and that the user must download updates manually from GitHub_Releases
2. IF a code signing verification failure occurs, THEN THE AutoUpdater SHALL NOT crash and SHALL continue responding to user interactions, and SHALL transition to the "error" UpdateStatus followed by "idle" so that the application remains in a recoverable state
3. IF a code signing verification failure occurs, THEN THE Renderer SHALL display a dismissible Toast_Notification informing the user that auto-update is unavailable for unsigned builds and that manual download from GitHub_Releases is required
4. IF a code signing verification failure occurs, THEN THE AutoUpdater SHALL return to a state where subsequent manual or scheduled update checks can proceed at their normal intervals

### Requirement 10: Error Handling - Download Interruption and Disk Space

**User Story:** As a user, I want download interruptions and disk space issues to be handled transparently, so that updates eventually succeed without my intervention.

#### Acceptance Criteria

1. IF a download is interrupted by network loss, THEN THE AutoUpdater SHALL discard the incomplete download, return to idle state, and resume the download automatically on the next scheduled or manual check using differential download capabilities via blockmap files
2. IF insufficient disk space prevents the download, THEN THE AutoUpdater SHALL notify the user via a Toast_Notification indicating that the update cannot be downloaded due to insufficient disk space, send an update-error IPC message to the renderer, and return to idle state
3. IF a downloaded file fails signature verification, THEN THE AutoUpdater SHALL delete the corrupted file, return to idle state, and perform a full re-download on the next scheduled or manual check
4. IF a download fails due to interruption or corruption on 3 consecutive scheduled checks, THEN THE AutoUpdater SHALL notify the user via a Toast_Notification indicating that the update could not be completed and that a manual download may be required

### Requirement 11: Logging

**User Story:** As a developer, I want all update events logged, so that I can diagnose update issues reported by users.

#### Acceptance Criteria

1. THE AutoUpdater SHALL log all update lifecycle events including check initiated, update available, download started, download completed, error, and installation triggered, each at the "info" log level for non-error events and "error" log level for error events
2. WHEN an update-available or update-downloaded event occurs, THE AutoUpdater SHALL include the version number in the log entry
3. WHEN an error occurs during any update operation, THE AutoUpdater SHALL log the error details including the error code, error message, and the operation that was in progress when the error occurred (checking, downloading, or installing)
