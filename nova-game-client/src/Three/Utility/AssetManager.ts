
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

    //No asset server exists yet - ASSETSERVERURL only ever pointed at a local dev-only one, so
    //requesting anything would just try (and fail) to reach localhost from wherever the game's
    //actually hosted, which browsers now flag as a page reaching into your local network. Left
    //disabled like this, rather than ripping the loading code out, for whenever real hosting
    //(R2, matching how levels/thumbnails already work) is wired up - see loadModel/loadAudio.
    public static async RequestModel(assetPath : string) : Promise<THREE.Scene>{
        throw new Error(`AssetManager: no asset server configured (requested "${assetPath}")`);
    }

    public static async RequestAudio(assetPath : string) : Promise<AudioBuffer>{
        throw new Error(`AssetManager: no asset server configured (requested "${assetPath}")`);
    }



    //Not private - nothing in the class calls these while disabled above, and TS flags an
    //unused *private* method as an error (unlike public ones, which it can't prove are dead).
    static async loadModel(url: string)  {
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



     static async loadAudio(url: string) {
         return new Promise<AudioBuffer>((resolve, reject) => {
             const fullUrl = ASSETSERVERURL.replace(/\/+$/, '') + '/audio/' + url.replace(/^\/+/, '');

             AssetManager.audioLoader.load(fullUrl, (buffer : AudioBuffer) => {
                 AssetManager.gotAudioAssets.set(url, buffer);

                 resolve(buffer);
             }, undefined, reject);
         });
     }

}