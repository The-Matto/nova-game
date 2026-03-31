
import {GameStats, PlayerStatics} from "../Utility/PlayerGlobals";
import {virtualCursorPosition} from "../../InputMaps";


export class UiDOMInterop {

    DomIdMap = new Map<HTMLElement | null, (el:HTMLElement | null)=>void >();

    constructor() {

        //TODO Prefix these DOM elems
        this.addElement('fps-counter', (el : HTMLElement | null)=>{
            if (el)
                el.innerText = `FPS: ${Math.round(GameStats.fps)}`;
        })
        this.addElement('virtual-cursor', (el : HTMLElement | null)=>{
            //TODO Add check to ensure we have cursor visible
            if (el) {
                el.style.transform = `translate(${virtualCursorPosition.x}px, ${virtualCursorPosition.y}px)`;
                el.style.visibility = PlayerStatics.PlayerController?.GetShowMouseCursor() ?  'visible' : 'hidden';
            }
        });

        const cursor = document.getElementById('virtual-cursor');

        requestAnimationFrame(() => {
            if (cursor) {
                cursor.style.transform = `translate(${virtualCursorPosition.x}px, ${virtualCursorPosition.y}px)`;
            }

    });
    }

    addElement( idName: string, func :(el:HTMLElement | null)=>void){
        this.DomIdMap.set(document.getElementById(idName), func)
    }

    tick(){
        this.DomIdMap.forEach((v: (el:HTMLElement | null)=>void, k:HTMLElement | null) => {v(k);})
    }

}