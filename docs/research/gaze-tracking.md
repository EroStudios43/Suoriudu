# Gaze tracking
## What we tested
Hue-vision with Tensorflow and Mediapipe
Mediapipe focus-text example

## What we chose
Mediapipe focus-text example

## Why
Mediapipe had tons of documentation available, and had a working library for React applications.

The other example codes found either didn't start working in a reasonable timeframe, or didn't fulfill the requirements the project had.
For instance, Hue-vision required a setup for every user needing it. The setup process was complicated, and results weren't accurate even when the AI was calibrated correctly.
In addition, Hue-vision required separate AI-training for each user, which takes up resources from the computer and is not the best approach in an exam environment.

Webgazer.js had a react library, but it was significantly older and less maintained than Google's mediapipe.
The primary method of using Webgazer.js was to include a <script> </script> inside the file itself. 
This is not the best approach in React environment, and the webgazer itself didn't necessarily use AI at all (has been around since before AI became mainstream)