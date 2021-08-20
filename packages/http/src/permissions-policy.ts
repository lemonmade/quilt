/**
 * Provides friendly names for the permissions policy “directives”,
 * which are the fields that allow you to control the policy’s behavior.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy#directives
 */
export enum PermissionsPolicyDirective {
  /**
   * Controls whether the current document is allowed to gather information about the acceleration of
   * the device through the Accelerometer interface.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/accelerometer
   */
  Accelerometer = 'accelerometer',

  /**
   * Controls whether the current document is allowed to gather information
   * about the amount of light in the environment around the device through
   * the AmbientLightSensor interface.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/ambient-light-sensor
   */
  AmbientLightSensor = 'ambient-light-sensor',

  /**
   * Controls whether the current document is allowed to autoplay media requested through the
   * HTMLMediaElement interface. This includes both the use of the `autoplay`
   * attribute on `<video>` and `<audio>` elements, and the `HTMLMediaElement.play()`
   * method.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/autoplay
   */
  Autoplay = 'autoplay',

  /**
   * Controls whether the current document is allowed to use video input devices.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/camera
   */
  Camera = 'camera',

  /**
   * Controls whether or not the current document is permitted to use the
   * `getDisplayMedia()` method to capture screen contents.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/display-capture
   */
  DisplayCapture = 'display-capture',

  /**
   * Controls whether the current document is allowed to set document.domain.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/document-domain
   */
  DocumentDomain = 'document-domain',

  /**
   * Controls whether the current document is allowed to use the Encrypted
   * Media Extensions API (EME).
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/encrypted-media
   */
  EncryptedMedia = 'encrypted-media',

  /**
   * Controls whether tasks should execute in frames while they're not being
   * rendered (e.g. if an iframe is hidden or display: none).
   */
  ExecutionWhileNotRendered = 'execution-while-not-rendered',

  /**
   * Controls whether tasks should execute in frames while they're outside of
   * the visible viewport.
   */
  ExecutionWhileOutOfViewport = 'execution-while-out-of-viewport',

  /**
   * Controls whether the current document is allowed to use
   * `Element.requestFullScreen()`.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/fullscreen
   */
  FullScreen = 'fullscreen',

  /**
   * Controls whether the current document is allowed to use the Gamepad API.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/gamepad
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API
   */
  Gamepad = 'gamepad',

  /**
   * Controls whether the current document is allowed to use the
   * Geolocation Interface.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/geolocation
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Geolocation
   */
  Geolocation = 'geolocation',

  /**
   * Controls whether the current document is allowed to gather information
   * about the orientation of the device through the Gyroscope interface.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/gyroscope
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Gyroscope
   */
  Gyroscope = 'gyroscope',

  /**
   * Controls whether the user to be tracked and categorized using Google’s
   * “Federated Learning of Cohorts” initiative.
   *
   * @see https://www.eff.org/deeplinks/2021/03/googles-floc-terrible-idea
   * @see https://web.dev/floc/
   */
  InterestCohort = 'interest-cohort',

  /**
   * Controls whether the current document is allowed to gather information
   * about the orientation of the device through the Magnetometer interface.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/magnetometer
   */
  Magnetometer = 'magnetometer',

  /**
   * Controls whether the current document is allowed to use audio input devices.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/microphone
   */
  Microphone = 'microphone',

  /**
   * Controls whether the current document is allowed to use the Web MIDI API.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/midi
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API
   */
  Midi = 'midi',

  /**
   * Controls the availability of mechanisms that enables the page author
   * to take control over the behavior of spatial navigation, or to cancel
   * it outright.
   */
  NavigationOverride = 'navigation-override',

  /**
   * Controls whether the current document is allowed to use the Payment Request API.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/payment
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Payment_Request_API
   */
  Payment = 'payment',

  /**
   * Controls whether the current document is allowed to play a video in a Picture-in-Picture mode.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/picture-in-picture
   */
  PictureInPicture = 'picture-in-picture',

  /**
   * Controls whether the current document is allowed to use the Web
   * Authentication API to retrieve already stored public-key credentials.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/publickey-credentials-get
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API
   */
  PublicKeyCredentialsGet = 'publickey-credentials-get',

  /**
   * Controls whether the current document is allowed to make synchronous XMLHttpRequest requests.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/sync-xhr
   */
  SyncXhr = 'sync-xhr',

  /**
   * Controls whether the current document is allowed to use the WebUSB API.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/usb
   * @see https://wicg.github.io/webusb/
   */
  Usb = 'usb',

  /**
   * Controls whether or not the current document is allowed to use the
   * `Navigator.share()` API to share text, links, images, and other content
   * to arbitrary destinations of user's choice.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/web-share
   */
  WebShare = 'web-share',

  /**
   * Controls whether or not the current document is allowed to use the WebXR
   * Device API to interact with a WebXR session.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/xr-spatial-tracking
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
   */
  XrSpatialTracking = 'xr-spatial-tracking',
}

/**
 * A collection of special sources allowed in permissions policy
 * directives.
 */
export enum PermissionsPolicySpecialSource {
  Any = '*',
  Self = 'self',
  Source = 'src',
}
