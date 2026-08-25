
import {GameStats} from "../Utility/PlayerGlobals";


export class UiDOMInterop {

    DomIdMap = new Map<HTMLElement | null, (el:HTMLElement | null)=>void >();

    constructor() {

        //TODO Prefix these DOM elems
        this.addElement('fps-counter', (el : HTMLElement | null)=>{
            if (el)
                el.innerText = `FPS: ${Math.round(GameStats.fps)}`;
        })
    }

    addElement( idName: string, func :(el:HTMLElement | null)=>void){
        this.DomIdMap.set(document.getElementById(idName), func)
    }

    tick(){
        this.DomIdMap.forEach((v: (el:HTMLElement | null)=>void, k:HTMLElement | null) => {v(k);})
    }

}