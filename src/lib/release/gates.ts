import 'server-only';
/**
 * ANDRAI OS-10: global kill-switch for every commercial write surface.
 *
 * BOTH conditions must be met before a feature may mutate data:
 *  - OS10_PILOT_READ_ONLY must be explicitly set to 'false'
 *  - that feature's dedicated OS0x_*_WRITES_ENABLED must be explicitly 'true'.
 *
 * Missing or unexpected values always fail closed.
 * Owner approval and E2E checks are required before anyone changes these flags.
 */
export function isPilotReadOnly():boolean {
 return process.env.OS10_PILOT_READ_ONLY!=='false';
}
