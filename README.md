
# DIY Digital Spectroscopy

This repository contains free digital spectroscopy software and 3D printable .3mf files (by Davis Fay and Bernard Markus) for an Arducam + 10deg-20deg lens digital spectroscope. Uses stock 1000 line/mm diffraction grating sheets over the lens. The slit uses single edge stainless steel razor blades glued to an adjustible front plate for precise slit width control, we achieved <0.05mm easily with a spacer.

## 3D Printing:
- [3D Prints](./3D_PRINTABLE/Main%20Modules/)
- Arducam Mount: [Materials](./3D_PRINTABLE/Main%20Modules/Required%20Hardware%20List%20-%20Arducam%20Version.txt)
- Mobile Camera Mount: [Materials](./3D_PRINTABLE/Main%20Modules/Required%20Hardware%20List%20-%20Smartphone%20Version.txt)

## Additional Resources
- [Spectrometer Workbench Demo](https://camspectrometer.netlify.app)
- [Machine Learning Spectral/Image Identification Demo](https://github.com/joshbrew/cameraId-wonnx-wasm)
- [Original Theremino DIY Guide](https://www.theremino.com/wp-content/uploads/files/Theremino_Spectrometer_Construction_ENG.pdf)
- [DIY Hyperspectral imaging paper](https://www.mdpi.com/2313-433X/7/8/136)

We are working on a web based hyperspectral imaging tool on top of a proof of concept identification pipeline.

### Revision 2 Phone and Arducam Mounts by Davis Fay:

<table>
  <tr>
    <td>
      <img src="./screenshots/arducambox.jpg" alt="boxa" style="width: 100%;"/>
    </td>
    <td>
      <img src="./screenshots/arducambox2.jpg" alt="boxb" style="width: 100%;"/>
    </td>
  </tr>
  <tr>
    <td>
      <img src="./screenshots/phonebox.jpg" alt="boxc" style="width: 100%;"/>
    </td>
    <td>
      <img src="./screenshots/phonebox2.jpg" alt="boxd" style="width: 100%;"/>
    </td>
  </tr>
</table>

### Phone Hyperspectral Imaging Results:

<table>
  <tr>
    <td>
      <img src="./screenshots/hyperspectral/setup.webp" alt="setup" style="width: 100%;"/>
    </td>
    <td>
      <img src="./screenshots/hyperspectral/light.webp" alt="light" style="width: 100%;"/>
    </td>
    <td>
      <img src="./screenshots/hyperspectral/fossil.webp" alt="fossil" style="width: 100%;"/>
    </td>
  </tr>
  <tr>
    <td colSpan="2">
      <img src="./screenshots/hyperspectral/scan1_3.webp" alt="scan" style="width: 100%;"/>
    </td>
    <td>
      <img src="./screenshots/hyperspectral/scan3_3.webp" alt="scan2" style="width: 100%;"/>
    </td>
  </tr>
</table>

### Revision 1 by Bernard Markus:

<table>
  <tr>
    <td>
      <img src="./screenshots/Capturea.PNG" alt="capturea" style="width: 100%;"/>
    </td>
    <td>
      <img src="./screenshots/boxa.jpg" alt="boxb" style="width: 100%;"/>
    </td>
    <td>
      <img src="./screenshots/boxb.jpg" alt="boxb" style="width: 100%;"/>
    </td>
  </tr>
  <tr>
    <td>
      <img src="./screenshots/boxc.jpg" alt="boxc" style="width: 100%;"/>
    </td>
    <td>
      <img src="./screenshots/imaging.jpg" alt="boxd" style="width: 100%;"/>
    </td>
    <td>
      Chocolate bar wrapper hyperspectral scan:<br>
      <img src="https://github.com/joshbrew/cameraId-wonnx-wasm/assets/18196383/f62e5360-8742-4124-9eb2-8085ab54e5f9" alt="Capture2">
    </td>
  </tr>
</table>


Make sure the diffraction grating is aligned vertically with the slit. The camera rotation should be so that the image is horizontal, you can have it aligned right to left or left to right for increasing wavelength at your preference.

## Software demo

Perform digital spectral decomposition in your browser! 

This repo comes with a digital spectrometer workbench prototype, works with any webcam or image/video uploads. This is a pre-alpha functional test. See the live demo at https://camspectrometer.netlify.app built directly from this repo using Netlify.

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

All of the prototypes by Bernard:
- [Draft Viewer from Bernard Markus](https://a360.co/3FZsu7q)
![prototypes](./screenshots/Captureb.PNG)

### Credits
- 3D print files by Bernard Markus and Davis Fay
- Spectrometer software demo by Joshua Brewster and Garrett Flynn.
- Fishazam project by Yassine Santissi.
- This project is being developed for creating a fish identification dataset. 

Inspired by the [Theremino spectrometer tutorial](https://www.theremino.com/wp-content/uploads/files/Theremino_Spectrometer_Construction_ENG.pdf), with a much needed update using an accessible browser framework. You can use this to build your own.

###### Sponsored by [Schmidt Marine](https://www.schmidtmarine.org/) Foundation.

We recommend using the 1080p Arducam with an 8mm lens with no IR-CUT filter or night vision LEDs (you can just unplug them if they come with it). The diffraction grating is the one from children's toy science kits. The box, well we just used what was within reach... 

We're going to develop our own dedicated low cost solution to help run mass data collection experiments to test fish being sold on the market for quality, correct identification, etc. purposes.
