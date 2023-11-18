
## DIY Digital Spectroscope

This repository contains 3D printable .3mf files (by Bernard Markus) for an Arducam + 10deg-20deg lens digital spectroscope. Uses stock 1000 line/mm diffraction grating sheets over the lens. The slit uses single edge stainless steel razor blades glued to an adjustible front plate for precise slit width control, we achieved <0.05mm easily with a spacer.

Slicer:
![slicer](./screenshots/cura.PNG)
3D model (https://a360.co/3FZsu7q):
![device](./screenshots/Capturea.PNG)
Flourescent light test result:
![result](./screenshots/image-1.png)
Print result:
![boxa](./screenshots/boxa.jpg)
![boxb](./screenshots/boxb.jpg)
![boxc](./screenshots/boxc.jpg)

Recommended print settings: 
- .4mm nozzle, 
- PLA on default settings is fine, 
- 2 perimeters (important!), 
- 20% infill.

Additionally required:
- 1080p Arducam + 10deg or 20deg M12 lens. Remove IR filters over lenses for more bandwidth.
- 1000 line/mm diffraction grating, tape it over the rectangular piece that fits over the lenses. You can find these stock online in kid's science kits.
- Uses single edge stainless steel razor blades glued over the slit
- The screws on the front plate for adjusting the slit are M1.6 12mm. You can use a sheet of paper as spacer.
- The back mounted handles use 4 M3 8mm screws. 

Make sure the diffraction grating is aligned vertically with the slit. The camera rotation should be so that the image is horizontal, you can have it aligned right to left or left to right for increasing wavelength at your preference.

## Software demo

Perform digital spectral decomposition in your browser! 

This repo comes with a digital spectrometer workbench prototype, works with any webcam or image/video uploads. This is a pre-alpha functional test. See the live demo at https://fishscanner.com built directly from this repo using Netlify.

See also: [WONNX Camera ID Demo](https://github.com/joshbrew/cameraId-wonnx-wasm) for a real time video classifier demo, which we're working on hooking up to the spectrogram outputs as well for a proof of concept.

To run:
`npm start` or `tinybuild`

Or `npm i -g tinybuild` then the above command.

Software example (cropped):
![scrn](screenshots/tilapia_v_rockfish.PNG)

My first test of a tabletop spectrometer using a 1080p wifi cam, 1000 line/mm off-the-shelf diffraction grating (e.g. from Amazon), black foam board, and a lot of tape:
![test](screenshots/testspect.jpg)

Results - sunlight through my window:
![wind](screenshots/window.jpg)

- Not yet added: wavelength estimation, etc. 

## Resources
- [Spectrometer Workbench Demo](https://fishscanner.com)
- [Machine Learning Image Identification Demo](https://github.com/joshbrew/cameraId-wonnx-wasm)
- [3D printable Spectrometer Viewer](https://a360.co/3FZsu7q)
- [Original Theremino DIY Guide](https://www.theremino.com/wp-content/uploads/files/Theremino_Spectrometer_Construction_ENG.pdf)
- [DIY Hyperspectral imaging paper](https://www.mdpi.com/2313-433X/7/8/136)

### Credits
- 3D print files by Bernard Markus
- Spectrometer software demo by Joshua Brewster and Garrett Flynn.
- Fishazam project by Yassine Santissi.
- This project is being developed for creating a fish identification dataset. 

Inspired by the [Theremino spectrometer tutorial](https://www.theremino.com/wp-content/uploads/files/Theremino_Spectrometer_Construction_ENG.pdf), with a much needed update using an accessible browser framework. You can use this to build your own.

###### Sponsored by [Schmidt Marine](https://www.schmidtmarine.org/) Foundation.

We recommend using the 1080p Arducam with an 8mm lens with no IR-CUT filter or night vision LEDs (you can just unplug them if they come with it). The diffraction grating is the one from children's toy science kits. The box, well we just used what was within reach... 

We're going to develop our own dedicated low cost solution to help run mass data collection experiments to test fish being sold on the market for quality, correct identification, etc. purposes.
