Digital spectrometer workbench, works with any webcam or image/video uploads. This is a pre-alpha functional test.

See the live demo at https://fishscanner.com built directly from this repo using Netlify.

Perform spectral decomposition in your browser! Inspired by the [Theremino spectrometer tutorial](https://www.theremino.com/wp-content/uploads/files/Theremino_Spectrometer_Construction_ENG.pdf), with a much needed update using an accessible browser framework. You can use this to build your own.

To run:
`tinybuild`

Or `npm i -g tinybuild` then the above command.

Software example (cropped):
![scrn](screenshots/tilapia_v_rockfish.PNG)

My first test of a tabletop spectrometer using a 1080p wifi cam, 1000 line/mm off-the-shelf diffraction grating (e.g. from Amazon), black foam board, and a lot of tape:
![test](screenshots/testspect.jpg)

Results - sunlight through my window:
![wind](screenshots/window.jpg)


By Joshua Brewster, Yassine Santissi, and Garrett Flynn.


This project is being developed for creating a fish identification dataset. 

###### Sponsored by [Schmidt Marine](https://www.schmidtmarine.org/) Foundation.

We recommend using the 1080p Arducam with an 8mm lens with no IR-CUT filter or night vision LEDs (you can just unplug them if they come with it). The diffraction grating is the one from children's toy science kits. The box, well we just used what was within reach... 

We're going to develop our own dedicated low cost solution to help run mass data collection experiments to test fish being sold on the market for quality, correct identification, etc. purposes.