---
name: verify-ios
description: Check a native change in the iOS simulator with the Expo MCP server — screenshots, taps by testID, view inspection, device and JS logs. Also covers installing Expo packages at SDK-compatible versions and reading EAS build failures. Use after changing a screen or component under apps/native, when a mobile change needs visual or interaction confirmation, or when an EAS build or TestFlight crash needs investigating.
paths:
  - "apps/native/**"
---

# Verifying native changes in the simulator

The `expo` MCP server has two halves. The **server** half (docs, `expo install`, EAS, TestFlight)
works once you are authenticated. The **local** half — screenshots, taps, logs — exists only while a
local dev server runs with the MCP flag set:

```bash
pnpm --filter @acme/native exec expo install expo-mcp --dev
pnpm --filter @acme/native dev:mcp     # EXPO_UNSTABLE_MCP_SERVER=1 expo start --dev-client
```

Then **reconnect the MCP server in your client**. This is the failure everyone hits: local tools are
advertised at connection time, so starting the dev server afterwards leaves them silently absent and
the agent concludes the feature does not exist. Restarting the dev server invalidates them again.
macOS only, simulator only, one dev server at a time.

## The loop

1. `automation_take_screenshot` for the current state.
2. `automation_find_view` with a `testID` to confirm something rendered and get its position and
   visibility.
3. `automation_tap` by `testID`, not coordinates — coordinates break the moment layout shifts, and a
   tap on the wrong spot looks like a broken feature.
4. Screenshot again to confirm the interaction did what you expected.
5. `collect_app_logs` for a runtime error; `open_devtools` when you need the component tree or JS
   state rather than a picture.

If you intend to tap something, add a `testID` to it in the same change.

## The server half

Install Expo packages with `add_library` or `expo install`, never bare `pnpm add`: they resolve the
version matching the installed SDK. `read_documentation` and `search_documentation` (the latter needs
a paid EAS plan) beat guessing at an Expo API. For a red build, `build_list` then `build_logs`;
`testflight_crashes` returns crash logs with stack traces.

## Gotchas

- Dev client, not Expo Go. After adding a native dependency run
  `pnpm --filter @acme/native prebuild:clean` and rebuild; a JS reload will not pick it up.
- `expo_router_sitemap` is useless here — this app uses React Navigation, and a screen is reachable
  only after both registrations described in `expo-app`.
- A screenshot proves rendering, not correctness. `pnpm --filter @acme/native test` (Jest) and
  `pnpm verify` are still the gate.
- Maestro (`pnpm --filter @acme/native test:e2e` against `.maestro/`) is for scripted repeatable
  flows; MCP automation is for exploratory checks during a change.
