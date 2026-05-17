# Changelog: ArcadeGPU Tank Pursuit

## [1.1.0] - 2026-05-01
### Added
- **JSM Model Support**: Transitioned from procedural box generation to JSM (JSON Static Mesh) file loading for the Tank and Player models.
- **Project Map**: Added `PROJECT_MAP.md` for better architectural overview.
- **Improved Metadata**: Updated application name and description for clearer branding.

### Changed
- **Tank Entity**: Refactored to load components (body, turret, barrel) from `.jsm` files.
- **Player Entity**: Refactored to load head and torso from `.jsm` files.
- **README Clean-up**: Comprehensive update to `README.md` for dev handoff, including a clear directory tree and getting started guide.

### Fixed
- **Camera Sensitivity**: Adjusted mouse movement scaling for smoother orbit control.
- **Input Registration**: Centralized input action registration in `GameScreen`.

## [1.0.0] - Initial Release
- Basic tank movement and shooting.
- Jolt Physics integration.
- Enemy AI with basic chasing and firing.
- On-foot player mode with entry/exit mechanics.
