---
name: verify-ios
description: Check a native change in the iOS simulator with the Expo and XcodeBuildMCP servers or the axe CLI — screenshots, taps by testID, device and JS logs, and xcodebuild or simctl for the native build itself. Also covers installing Expo packages at SDK-compatible versions and reading EAS build failures. Use after changing a screen or component under apps/native, when a mobile change needs visual or interaction confirmation, or when a native build, EAS build, or TestFlight crash needs investigating.
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

## When the local half is absent: `axe`

`axe` (Homebrew: `cameroncooke/axe`) drives a booted simulator from the shell, and is what
XcodeBuildMCP's `ui-automation` workflow shells out to. It talks to CoreSimulator, so unlike
AppleScript it needs no macOS accessibility grant:

```bash
axe describe-ui --udid $(xcrun simctl list devices booted -j | jq -r '..|.udid? //empty' | head -1)
axe tap -x 244 -y 815 --udid <udid>
```

`describe-ui` returns the accessibility tree with an `AXFrame` per node — read the frame for the
`AXUniqueId` matching your `testID`, then tap its centre. Frames are in points, not screenshot
pixels. Pair it with XcodeBuildMCP `screenshot` to confirm the result.

## The server half

Install Expo packages with `add_library` or `expo install`, never bare `pnpm add`: they resolve the
version matching the installed SDK. `read_documentation` and `search_documentation` (the latter needs
a paid EAS plan) beat guessing at an Expo API. For a red build, `build_list` then `build_logs`;
`testflight_crashes` returns crash logs with stack traces.

## When Expo is not enough

`XcodeBuildMCP` wraps `xcodebuild` and `simctl` for the layer Expo hides: a compile error in a pod or
config plugin, a signing failure, a crash that needs LLDB. Reach for it when the native build itself
is the problem, not the JS.

It builds from `ios/`, which is generated and gitignored here, so run
`pnpm --filter @acme/native prebuild` first or there is no project to open. Only the simulator
workflow is enabled, which is the 24 tools worth having by default; `device`, `debugging`, and
`ui-automation` are opt-in through `XCODEBUILDMCP_ENABLED_WORKFLOWS` in the two config files. Prefer
Expo's own tools for anything both can do — they understand the managed config, and `xcodebuild`
does not.

## Gotchas

- Dev client, not Expo Go. After adding a native dependency run
  `pnpm --filter @acme/native prebuild:clean` and rebuild; a JS reload will not pick it up.
- `expo_router_sitemap` is useless here — this app uses React Navigation, and a screen is reachable
  only after both registrations described in `expo-app`.
- A screenshot proves rendering, not correctness. `pnpm --filter @acme/native test` (Jest) and
  `pnpm verify` are still the gate.
- Maestro (`pnpm --filter @acme/native test:e2e` against `.maestro/`) is for scripted repeatable
  flows; MCP automation is for exploratory checks during a change.
