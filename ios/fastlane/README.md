fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios create_app

```sh
[bundle exec] fastlane ios create_app
```

Create the App Store Connect app record (run once)

### ios build_release

```sh
[bundle exec] fastlane ios build_release
```

Hermetic release build: fresh web bundle → archive → export

### ios release

```sh
[bundle exec] fastlane ios release
```

Upload iOS binary + metadata + screenshots

### ios screenshots

```sh
[bundle exec] fastlane ios screenshots
```

Re-upload iOS screenshots only (replaces the whole set)

----


## tvos

### tvos build_release

```sh
[bundle exec] fastlane tvos build_release
```

Archive + export the tvOS app (scene loops must exist in LivingGlassTV/Videos)

### tvos release

```sh
[bundle exec] fastlane tvos release
```

Upload tvOS binary + tvOS screenshots to the same record

### tvos metadata

```sh
[bundle exec] fastlane tvos metadata
```

Upload only tvOS metadata + screenshots (no binary)

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
