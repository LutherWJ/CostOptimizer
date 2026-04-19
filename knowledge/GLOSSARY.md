# Glossary (Technical Terms)

This file defines common technical terms used by the support bot. Keep definitions short and practical.

## Core concepts

### Workload
A category of use (example: “Office Productivity”, “Web Development”, “Video Editing”). Workloads usually map to minimum laptop specs.

### Software profile
A compatibility/requirements entry for a specific app (example: ExamSoft/Examplify). It usually includes OS requirement and any required workloads.

### Compatibility
Whether something is expected to work on a given OS/hardware in our environment. “Compatible” does not always mean “runs well”.

## Operating systems

### Windows
Microsoft’s desktop OS. Some professional software is Windows-only.

### macOS
Apple’s desktop OS for MacBooks and iMacs. Some Windows-only apps may require workarounds.

### OS requirement
The OS a software requires:
- `win`: Windows required
- `mac`: macOS required
- `any`: runs on Windows or macOS (still may have hardware requirements)

## Running Windows-only apps on a Mac (workarounds)

### Virtual machine (VM)
Running another OS inside a window (example: Windows inside macOS). Pros: convenient. Cons: needs extra RAM/CPU, setup time, and sometimes isn’t allowed for exam/proctoring software.

### Remote desktop / VDI
Using a remote Windows computer from your laptop (example: school lab PC, Citrix/VDI). Pros: works even on a Mac. Cons: needs reliable internet and may not be allowed during exams.

## Hardware terms

### RAM (memory)
Short-term working memory. Too little RAM causes slowdowns, especially with browsers, VMs, and large apps.

### Storage (SSD)
Disk space. SSDs are faster than HDDs. Low storage can cause updates/apps to fail.

### CPU score
A simplified performance number used internally to compare CPUs. Higher is better.

### GPU
Graphics processor.

### Integrated GPU (iGPU)
Graphics built into the CPU. Fine for general use and light creative work.

### Discrete GPU (dGPU)
Separate graphics chip (NVIDIA/AMD). Helpful for 3D, rendering, some ML, and some creative apps.

### VRAM
GPU memory. Relevant for 3D/rendering and some compute workloads.

## Common support questions (what we should clarify)

- “What OS are you on (Windows/macOS)?”
- “What exact software name and version?”
- “Is this basic use or heavy use?”
- “Is this for coursework only, or also for exams/proctoring?”
- “Does your school require a specific proctoring tool (ExamSoft/Respondus/etc.)?”
