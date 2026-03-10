
import * as faceapi from 'face-api.js';

const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

let modelsLoaded = false;

export const loadModels = async () => {
  if (modelsLoaded) return;
  
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
    console.log('Face-api models loaded successfully');
  } catch (error) {
    console.error('Error loading face-api models:', error);
    throw error;
  }
};

export const getFaceDescriptor = async (imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) => {
  await loadModels();
  
  const detection = await faceapi
    .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
    
  if (!detection) {
    return null;
  }
  
  return Array.from(detection.descriptor);
};

export const compareFaces = async (storedDescriptor: number[], capturedDescriptor: number[], threshold = 0.6) => {
  const distance = faceapi.euclideanDistance(storedDescriptor, capturedDescriptor);
  return {
    isMatch: distance < threshold,
    distance
  };
};
