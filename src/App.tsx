import * as ortInstance from "onnxruntime-web";
import {
  defaultModelFetcher,
  FrameProcessor,
  Message,
  Silero,
  SpeechProbabilities,
} from "./scripts";

import workletPath from "./scripts/worklet?worker&url";
import modelPath from "./assets/vad.onnx?url";
import { useEffect } from "react";

const ort = ortInstance;

async function VAD() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      autoGainControl: true,
      noiseSuppression: true,
    },
  });

  const audioContext = new AudioContext();
  const sourceNode = new MediaStreamAudioSourceNode(audioContext, {
    mediaStream: stream,
  });

  await audioContext.audioWorklet.addModule(workletPath);

  const vadNode = new AudioWorkletNode(audioContext, "vad-worklet", {
    processorOptions: {
      frameSamples: 1536,
    },
  });

  const model = await Silero.new(ort, () => defaultModelFetcher(modelPath));

  const frameProcessor = new FrameProcessor(model.process, model.reset_state, {
    frameSamples: 1536,
    positiveSpeechThreshold: 0.5,
    negativeSpeechThreshold: 0.5 - 0.15,
    preSpeechPadFrames: 1,
    redemptionFrames: 8,
    minSpeechFrames: 3,
    submitUserSpeechOnPause: false,
  });

  const handleFrameProcessorEvent = (
    ev: Partial<{
      probs: SpeechProbabilities;
      msg: Message;
      audio: Float32Array;
    }>,
  ) => {
    switch (ev.msg) {
      case Message.SpeechStart:
        console.log("SpeechStart");
        break;

      case Message.SpeechEnd:
        console.log("SpeechEnd");
        break;

      default:
        break;
    }
  };

  const processFrame = async (frame: Float32Array) => {
    const ev = await frameProcessor.process(frame);
    handleFrameProcessorEvent(ev);
  };

  vadNode.port.onmessage = async (ev: MessageEvent) => {
    switch (ev.data?.message) {
      case Message.AudioFrame: {
        const buffer: ArrayBuffer = ev.data.data;
        const frame = new Float32Array(buffer);
        await processFrame(frame);
        break;
      }

      default:
        break;
    }
  };

  sourceNode.connect(vadNode);

  return {
    start: () => frameProcessor.resume(),
    pause: () => {
      const ev = frameProcessor.pause();
      handleFrameProcessorEvent(ev);
    },
    destroy: () => {
      vadNode.port.postMessage({
        message: Message.SpeechStop,
      });
      vadNode.disconnect();
    },
  };
}

export const App = () => {
  useEffect(() => {
    VAD().then((something) => {
      something.start();
    });
  }, []);

  return "hello";
};
