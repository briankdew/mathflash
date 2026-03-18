import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionErrorEvent,
  type ExpoSpeechRecognitionOptions,
  type ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';

export type SpeechRecognitionEventName =
  | 'start'
  | 'end'
  | 'speechstart'
  | 'speechend'
  | 'result'
  | 'error'
  | 'nomatch';

type SpeechRecognitionListenerMap = {
  start: () => void;
  end: () => void;
  speechstart: () => void;
  speechend: () => void;
  result: (event: ExpoSpeechRecognitionResultEvent) => void;
  error: (event: ExpoSpeechRecognitionErrorEvent) => void;
  nomatch: () => void;
};

export interface SpeechRecognitionAdapter {
  isRecognitionAvailable: () => boolean;
  supportsOnDeviceRecognition: () => boolean;
  getPermissionsAsync: typeof ExpoSpeechRecognitionModule.getPermissionsAsync;
  requestPermissionsAsync: typeof ExpoSpeechRecognitionModule.requestPermissionsAsync;
  start: (options: ExpoSpeechRecognitionOptions) => void;
  stop: () => void;
  addListener: <TEventName extends SpeechRecognitionEventName>(
    eventName: TEventName,
    listener: SpeechRecognitionListenerMap[TEventName]
  ) => { remove: () => void };
}

export const expoSpeechRecognitionAdapter: SpeechRecognitionAdapter = {
  isRecognitionAvailable: () =>
    ExpoSpeechRecognitionModule.isRecognitionAvailable(),
  supportsOnDeviceRecognition: () =>
    ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
  getPermissionsAsync: ExpoSpeechRecognitionModule.getPermissionsAsync,
  requestPermissionsAsync: ExpoSpeechRecognitionModule.requestPermissionsAsync,
  start: options => {
    ExpoSpeechRecognitionModule.start(options);
  },
  stop: () => {
    ExpoSpeechRecognitionModule.stop();
  },
  addListener: (eventName, listener) =>
    ExpoSpeechRecognitionModule.addListener(eventName, listener as never),
};
