# Real-time Facial Recognition 2.0

> This repository contains the source code for the 2nd version of the real time facial recognition system. It is the successor to [this](https://github.com/CJBuzz/FRS).

---

## Table of Contents

- [Description](#description)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

---

## Description

Real-time FRS 2.0 is an app with the capability to conduct facial recognition in real-time. Uses include attendance taking and showcase purposes.

The main FRS software can be found in the [simpliFRy](https://github.com/CJBuzz/Real-time-FRS-2.0/tree/main/simpliFRy) directory. **SimpliFRy** is a locally-hosted web application built using python 3.10 and [Flask](https://github.com/pallets/flask). It makes use of the [insightface](https://github.com/deepinsight/insightface) library by deepinsight for face detection and generation of embeddings and the [voyager](https://github.com/spotify/voyager) library by Spotify for K-Nearest Neighbour search.

Coming with simpliFRy is [gotendance](https://github.com/CJBuzz/Real-time-FRS-2.0/tree/main/gotendance). **gotendance** is also a locally-hosted web application, but built using Golang. It is an attendance-tracking app, intended as a companion to simpliFRy. The UI is in <ins>HTML/CSS/JS</ins> to ensure it is lightweight and easily deployable.

---

## Features

**SimpliFRy** is designed with the use of *Real-Time Streaming Protocol* (RTSP)-capable cameras in mind. The software access the camera's feed through an RTSP URL.

As compared to the previous iterations, **Real-time FRS 2.0** has the following benefits:

- Independent of 3rd party softwares such as OBS Studio (no need virtual camera).
- Able to do real-time facial recognition on multiple cameras simultaneously with just 1 computer.
- Designed to be simple and easy to use.
- Need not deal with complicated GPU prerequisites.

---

## Installation

For more information on installation, refer to the following:
- [simpliFRy](./simplifry/ReadME.md#installation)
- [gotendance](./gotendance/ReadME.md#installation)

---

## Usage

For more information on installation, refer to the following:
- [simpliFRy](./simpliFRy/ReadME.md#usage)
- [gotendance](./gotendance/ReadME.md#usage)

---

## Contributing

---

## License 

This project is licensed under the Apache License 2.0 - see the [LICENSE.md](https://github.com/CJBuzz/Real-time-FRS-2.0/blob/main/LICENSE) file for details.

---

## Acknowledgements

I would like to extend my gratitude to the following people and resources:
- [**Insightface**](https://github.com/deepinsight/insightface): The weights provided by insightface formed the core of this project's Facial Recognition capabilities.
- [**Voyager**](https://github.com/spotify/voyager): Voyager's vector search provided a quick and efficient way to match the closest embeddings.
- [**FFmpeg**](https://www.ffmpeg.org/): SimpliFRy uses FFmpeg to capture the RTSP stream for frame-by-frame analysis.
- [**Ruihongc**](https://github.com/ruihongc): Suggesting the use of Spotify's Voyager led to much better faster performance compared to previous methods.
- [**BabyWaffles**](https://github.com/BabyWaffles): Dockerization of simpliFRy was made possible by his extensive help.
- [**Tabler Icons**](https://tabler.io/icons): Multiple icons from Tabler were used in the UI of both simpliFRy and gotendance
