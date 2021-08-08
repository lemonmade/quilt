import type {PermissionsPolicySpecialSource} from '@quilted/http';

import {useHttpAction} from './http-action';

/**
 * Options for creating a content security policy.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
 */
export interface PermissionsPolicyOptions {
  /**
   * Controls whether the current document is allowed to gather information about the acceleration of
   * the device through the Accelerometer interface.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/accelerometer
   */
  accelerometer?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to gather information
   * about the amount of light in the environment around the device through
   * the AmbientLightSensor interface.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/ambient-light-sensor
   */
  ambientLightSensor?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to autoplay media requested through the
   * HTMLMediaElement interface. This includes both the use of the `autoplay`
   * attribute on `<video>` and `<audio>` elements, and the `HTMLMediaElement.play()`
   * method.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/autoplay
   */
  autoplay?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the use of the Battery Status API is allowed.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/battery
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API
   */
  battery?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to use video input devices.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/camera
   */
  camera?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether or not the current document is permitted to use the
   * `getDisplayMedia()` method to capture screen contents.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/display-capture
   */
  displayCapture?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to set document.domain.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/document-domain
   */
  documentDomain?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to use the Encrypted
   * Media Extensions API (EME).
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/encrypted-media
   */
  encryptedMedia?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether tasks should execute in frames while they're not being
   * rendered (e.g. if an iframe is hidden or display: none).
   */
  executionWhileNotRendered?:
    | false
    | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether tasks should execute in frames while they're outside of
   * the visible viewport.
   */
  executionWhileOutOfViewport?:
    | false
    | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to use
   * `Element.requestFullScreen()`.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/fullscreen
   */
  fullScreen?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to use the Gamepad API.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/gamepad
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API
   */
  gamepad?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to use the
   * Geolocation Interface.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/geolocation
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Geolocation
   */
  geolocation?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to gather information
   * about the orientation of the device through the Gyroscope interface.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/gyroscope
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Gyroscope
   */
  gyroscope?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the user will be tracked and categorized using Google’s
   * “Federated Learning of Cohorts” initiative.
   *
   * @default false
   * @see https://www.eff.org/deeplinks/2021/03/googles-floc-terrible-idea
   */
  interestCohort?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to gather information
   * about the orientation of the device through the Magnetometer interface.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/magnetometer
   */
  magnetometer?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to use audio input devices.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/microphone
   */
  microphone?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to use the Web MIDI API.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/midi
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API
   */
  midi?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls the availability of mechanisms that enables the page author
   * to take control over the behavior of spatial navigation, or to cancel
   * it outright.
   */
  navigationOverride?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to use the Payment Request API.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/payment
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Payment_Request_API
   */
  payment?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to play a video in a Picture-in-Picture mode.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/picture-in-picture
   */
  pictureInPicture?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to use the Web
   * Authentication API to retrieve already stored public-key credentials.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/publickey-credentials-get
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API
   */
  publicKeyCredentialsGet?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to make synchronous XMLHttpRequest requests.
   *
   * @default false
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/sync-xhr
   */
  syncXhr?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to use the WebUSB API.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/usb
   * @see https://wicg.github.io/webusb/
   */
  usb?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether or not the current document is allowed to use the
   * `Navigator.share()` API to share text, links, images, and other content
   * to arbitrary destinations of user's choice.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/web-share
   */
  webShare?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether or not the current document is allowed to use the WebXR
   * Device API to interact with a WebXR session.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/xr-spatial-tracking
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
   */
  xrSpatialTracking?: false | (PermissionsPolicySpecialSource | string)[];
}

const SPECIAL_SOURCES = new Set(['*', 'self', 'src']);

/**
 * Sets the `Permissions-Policy` header for this request.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy
 * @see https://w3c.github.io/webappsec-permissions-policy/#permissions-policy-http-header-field
 */
export function usePermissionsPolicy(value: string | PermissionsPolicyOptions) {
  useHttpAction((http) => {
    let normalizedValue = '';

    if (typeof value === 'string') {
      normalizedValue = value;
    } else {
      const {
        accelerometer,
        ambientLightSensor,
        autoplay,
        battery,
        camera,
        displayCapture,
        documentDomain,
        encryptedMedia,
        executionWhileNotRendered,
        executionWhileOutOfViewport,
        fullScreen,
        gamepad,
        geolocation,
        gyroscope,
        interestCohort = false,
        magnetometer,
        microphone,
        midi,
        navigationOverride,
        payment,
        pictureInPicture,
        publicKeyCredentialsGet,
        syncXhr = false,
        usb,
        webShare,
        xrSpatialTracking,
      } = value;

      const addDirective = (directive: string, value?: boolean | string[]) => {
        if (value == null) return;

        if (normalizedValue.length !== 0) normalizedValue += ', ';

        if (value === false) {
          normalizedValue += `${directive}=()`;
        } else if (Array.isArray(value)) {
          if (value.length === 0) {
            normalizedValue += `${directive}=()`;
          } else {
            normalizedValue += `${directive}=(${value
              .map((value) =>
                SPECIAL_SOURCES.has(value) ? value : JSON.stringify(value),
              )
              .join(' ')})`;
          }
        }
      };

      addDirective('interest-cohort', interestCohort);
      addDirective('accelerometer', accelerometer);
      addDirective('ambient-light-sensor', ambientLightSensor);
      addDirective('autoplay', autoplay);
      addDirective('battery', battery);
      addDirective('camera', camera);
      addDirective('display-capture', displayCapture);
      addDirective('document-domain', documentDomain);
      addDirective('encrypted-media', encryptedMedia);
      addDirective('execution-while-not-rendered', executionWhileNotRendered);
      addDirective(
        'execution-while-out-of-viewport',
        executionWhileOutOfViewport,
      );
      addDirective('fullscreen', fullScreen);
      addDirective('gamepad', gamepad);
      addDirective('geolocation', geolocation);
      addDirective('gyroscope', gyroscope);
      addDirective('interest-cohort', interestCohort);
      addDirective('magnetometer', magnetometer);
      addDirective('microphone', microphone);
      addDirective('midi', midi);
      addDirective('navigation-override', navigationOverride);
      addDirective('payment', payment);
      addDirective('picture-in-picture', pictureInPicture);
      addDirective('publickey-credentials-get', publicKeyCredentialsGet);
      addDirective('sync-xhr', syncXhr);
      addDirective('usb', usb);
      addDirective('web-share', webShare);
      addDirective('xr-spatial-tracking', xrSpatialTracking);
    }

    if (normalizedValue.length > 0) {
      http.responseHeaders.append('Permissions-Policy', normalizedValue);
    }
  });
}
