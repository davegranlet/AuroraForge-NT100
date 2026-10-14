# Aurora Entrance Lab Blender add-on

This is the first usability slice for the WWE 2K19 → WWE 2K26 entrance project.

## Current capability

- Loads the existing `aurora-forge-wwe2k19-to-wwe2k26-entrance-crosswalk/v1` JSON report.
- Shows each phase, source/target frame candidates, role mappings, and confidence in Blender's sidebar.
- Creates timeline markers for the phase sequence.
- Keeps the source reports read-only.
- Keeps `.clips` and `.adefs` export disabled because the payload writer is not proven.

## Install

1. Zip the `aurora_entrance_lab` folder or install it directly through Blender's **Edit → Preferences → Add-ons → Install**.
2. Enable **Aurora Entrance Lab**.
3. Open the 3D View sidebar (`N`) and choose the **Aurora** tab.
4. Select `analysis/rock-five-segments/100-to-1000100-crosswalk.json`.
5. Click **Load Crosswalk Report**, then **Build Timeline Preview**.

## Status boundary

This add-on is an inspection and timing-preview tool. It does not claim that WWE 2K19 YANM payloads can be written as WWE 2K26 `.clips` data, and it does not modify either game installation.
