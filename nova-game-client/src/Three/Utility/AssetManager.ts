
//import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from "three";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';


const ASSETSERVERURL : string = 'http://localhost:4000/assets/'




export class AssetManager {

    private static gotAudioAssets = new Map<string, AudioBuffer>();
    private static gotModelAssets = new Map<string, THREE.Scene>();

    private static gltfLoader = new GLTFLoader();
    private static audioLoader = new THREE.AudioLoader();

    public static async RequestModel(assetPath : string) : Promise<THREE.Scene>{
        if (AssetManager.gotModelAssets.has(assetPath)){
            const mesh = AssetManager.gotModelAssets.get(assetPath);
            if (mesh)
             return mesh;
        }
        return await AssetManager.loadModel(assetPath);
    }

    public static async RequestAudio(assetPath : string) : Promise<AudioBuffer>{
        if (AssetManager.gotAudioAssets.has(assetPath)){
            const audio = AssetManager.gotAudioAssets.get(assetPath);
            if (audio)
                return audio;
        }
        return await AssetManager.loadAudio(assetPath)
    }



    private static async loadModel(url: string)  {
         return new Promise<THREE.Scene>((resolve, reject) => {

             //TODO Add local storage support, so we can query local storage before reaching out to the storage bucket
             const fullUrl = ASSETSERVERURL.replace(/\/+$/, '') + '/models/' + url.replace(/^\/+/, '');
             console.log("Requesting model at - ", fullUrl)
             this.gltfLoader.load(fullUrl, (gltf : GLTF) => {
                 AssetManager.gotModelAssets.set(url, gltf.scene);

                 //TODO Load the Three BVH collision

                 resolve(gltf.scene);
             }, undefined, reject);
         });
     }



     private static async loadAudio(url: string) {
         return new Promise<AudioBuffer>((resolve, reject) => {
             const fullUrl = ASSETSERVERURL.replace(/\/+$/, '') + '/audio/' + url.replace(/^\/+/, '');

             AssetManager.audioLoader.load(fullUrl, (buffer : AudioBuffer) => {
                 AssetManager.gotAudioAssets.set(url, buffer);

                 resolve(buffer);
             }, undefined, reject);
         });
     }

}