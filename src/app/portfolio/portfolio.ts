import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, signal } from '@angular/core';
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

@Component({selector:'app-portfolio',standalone:true,templateUrl:'./portfolio.html',styleUrl:'./portfolio.scss'})
export class PortfolioComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas',{static:true}) canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('workVideoDialog',{static:true}) workVideoDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('certificateDialog',{static:true}) certificateDialog!: ElementRef<HTMLDialogElement>;
  readonly booting=signal(sessionStorage.getItem('jouhara-booted')!=='yes');
  readonly bootStarted=signal(false);
  readonly roomLightOn=signal(true);
  @ViewChild('wallSwitch',{static:true}) wallSwitch!:ElementRef<HTMLButtonElement>;
  private switchPosition=new THREE.Vector3();
  private lightLevel=1;
  private switchRocker?:THREE.Mesh;
  readonly folderClue=signal(true);
  readonly roomClue=signal(true);
  private switchAudio?:AudioContext;
  async toggleLight():Promise<void>{
    this.roomLightOn.update(value=>!value);
    try{
      const audio=this.switchAudio??(this.switchAudio=new AudioContext());await audio.resume();
      const buffer=audio.createBuffer(1,Math.floor(audio.sampleRate*.045),audio.sampleRate),samples=buffer.getChannelData(0);
      for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*Math.exp(-i/(audio.sampleRate*.008));
      for(const delay of [0,.055]){
        const tick=audio.createBufferSource(),gain=audio.createGain(),filter=audio.createBiquadFilter();
        tick.buffer=buffer;filter.type='bandpass';filter.frequency.value=1600;filter.Q.value=.8;gain.gain.value=.65;
        tick.connect(filter);filter.connect(gain);gain.connect(audio.destination);tick.start(audio.currentTime+.015+delay);
      }
    }catch{/* The visual switch works when audio is unavailable. */}
  }
  readonly exploreRoom=signal(false);
  toggleRoom():void{this.roomClue.set(false);this.exploreRoom.update(value=>!value);this.startMenuOpen.set(false);}
  private roomYaw=0;
  private roomPitch=.08;
  private roomZoom=1.4;
  private roomBlend=0;
  private smoothPointer=new THREE.Vector2();
  private dragPoint?:THREE.Vector2;
  private beginDrag=(event:PointerEvent):void=>{
    if(!this.exploreRoom()||(event.target as HTMLElement).closest('button,a'))return;
    this.dragPoint=new THREE.Vector2(event.clientX,event.clientY);
  };
  private endDrag=():void=>{this.dragPoint=undefined;};
  private roomWheel=(event:WheelEvent):void=>{
    if(!this.exploreRoom())return;
    event.preventDefault();this.roomZoom=THREE.MathUtils.clamp(this.roomZoom+event.deltaY*.001,1.05,2.4);
  };
  readonly startMenuOpen=signal(false);
  @ViewChild('desktopTaskbar',{static:true}) desktopTaskbar!:ElementRef<HTMLElement>;
  readonly openedFolder=signal<number|null>(null);
  readonly shutDown=signal(false);
  shutdown():void{
    this.shutDown.set(true);this.menuOpen.set(false);this.startMenuOpen.set(false);
    this.previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  }
  restart():void{
    this.shutDown.set(false);this.bootStarted.set(false);this.booting.set(true);
    this.openedFolder.set(null);this.bootStart=0;this.panelStage=0;this.scrollChapter=0;this.scrollPhase=0;
    window.scrollTo({top:0,behavior:'instant'});
    this.startBoot();
  }
  private bootTimer?:ReturnType<typeof setTimeout>;
  private bootStart=0;
  private bootSound?:HTMLAudioElement;
  private closeStartOutside=(event:MouseEvent):void=>{
    if(this.startMenuOpen()&&!(event.target as HTMLElement).closest('.desktop-start-menu,.desktop-start-button'))this.zone.run(()=>this.startMenuOpen.set(false));
  };
  private previousOverflow='';
  startBoot():void{
    if(this.bootStarted())return;
    this.bootStarted.set(true);this.bootStart=performance.now();
    const sound=new Audio(new URL('media/windows-7-startup.mp3',document.baseURI).href);
    this.bootSound=sound;sound.volume=.6;
    sound.addEventListener('ended',()=>this.zone.run(()=>this.finishBoot()),{once:true});
    this.bootTimer=setTimeout(()=>this.finishBoot(),6500);
    void sound.play().catch(()=>{
      clearTimeout(this.bootTimer);
      this.bootTimer=setTimeout(()=>this.zone.run(()=>this.finishBoot()),1800);
    });
  }
  finishBoot():void{
    clearTimeout(this.bootTimer);this.bootSound?.pause();this.booting.set(false);
    sessionStorage.setItem('jouhara-booted','yes');
    document.body.style.overflow='hidden';
    this.panelStage=.20;
    const section=this.canvas.nativeElement.parentElement?.querySelector<HTMLElement>('[data-chapter="0"]');
    if(section)window.scrollTo({top:section.offsetHeight*.20,behavior:'instant'});
  }
  readonly selectedCertificate=signal<string[]|null>(null);
  readonly chapters=['Introduction','About me','Skills','Experience','Education & certifications','Selected work','Let’s connect','Thank you'];
  readonly chapter=signal(0);
  readonly progress=signal(0);
  readonly menuOpen=signal(false);
  readonly motion=signal(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  readonly fallback=signal(false);
  readonly technologies=[
    ['Angular','A','#ef526c'],['React','⚛','#60d5ee'],['TypeScript','TS','#67aaff'],['JavaScript','JS','#f5dc66'],
    ['Node.js','N','#91ce78'],['Express','Ex','#b8c9df'],['Python','Py','#f4cf75'],['Django','Dj','#66c59c'],
    ['PostgreSQL','Pg','#7db8e9'],['MongoDB','M','#7dcb97'],['MySQL','My','#8bc5ed'],['SQL','SQL','#8caef7'],
    ['HTML','<>','#f59674'],['CSS','{ }','#78b8ff'],['SCSS','S','#df9bc6'],['Bootstrap','B','#b398f5'],
    ['Material UI','UI','#7db9f9'],['WordPress','W','#a7cbe9'],['Java','J','#edaa83'],['C','C','#a6bff5'],['C++','C++','#a6bff5']
  ];
  readonly certifications=[
    ['Py','Python for Web Development','IBM','certificates/python-web-development.jpeg'],
    ['J','Java Fundamentals','IBM','certificates/java-fundamentals.jpeg'],
    ['J','Java Essentials','Itvedant','certificates/java-essentials.jpg'],
    ['N','Node.js, Express & MongoDB','Itvedant','certificates/node-express-mongodb.jpg'],
    ['Dj','Django Framework','Itvedant','certificates/django-framework.jpg'],
    ['A','Angular 14','Itvedant','certificates/angular-14.jpg'],
    ['Py','Python Programming','Itvedant','certificates/python-programming.jpg'],
    ['SQL','SQL','Itvedant','certificates/sql.jpg'],
    ['<>','Web Designing','Itvedant · Sep 2022','certificates/web-designing.jpg']
  ];
  readonly toggleMenu=(value:boolean):boolean=>!value;
  private scene=new THREE.Scene();
  private camera=new THREE.PerspectiveCamera(46,1,.1,240);
  private renderer?:THREE.WebGLRenderer;
  private spatialRenderer?:CSS3DRenderer;
  private spatialScene=new THREE.Scene();
  readonly maximized=signal(false);
  private spatialPanels:CSS3DObject[]=[];
  private navigationClue?:HTMLDivElement;
  private contentMonitors:THREE.Group[]=[];
  private scrollChapter=0;
  private scrollPhase=0;
  private panelStage=0;
  private target=0;
  private current=0;
  private frame=0;
  private lastTime=0;

  private pointer=new THREE.Vector2();

  private stations:THREE.Group[]=[];
  private layers:THREE.Group[]=[];
  private textures:THREE.Texture[]=[];
  private orbit?:THREE.Group;
  private milestones:THREE.Group[]=[];
  private positions=[new THREE.Vector3(0,1.3,18),new THREE.Vector3(-2,2.2,15),new THREE.Vector3(0,1,0),new THREE.Vector3(0,1,-24),new THREE.Vector3(0,1,-48),new THREE.Vector3(0,1,-72),new THREE.Vector3(-3,3,-89)];
  constructor(private zone:NgZone){}
  ngAfterViewInit():void{
    try{this.init();this.initSpatialContent();}catch{this.fallback.set(true);}
    document.addEventListener('click',this.closeStartOutside);
    window.addEventListener('scroll',this.syncScroll,{passive:true});
    this.syncScroll();
    document.body.style.overflow='hidden';
    if(this.booting()){
      this.previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
      window.scrollTo({top:0,behavior:'instant'});
    }
    window.addEventListener('keydown',this.key);
    window.addEventListener('pointermove',this.move);
    window.addEventListener('pointerdown',this.beginDrag);window.addEventListener('pointerup',this.endDrag);
    window.addEventListener('wheel',this.roomWheel,{passive:false});

    window.addEventListener('resize',this.resize);
  }
  private syncScroll=():void=>{
    const sections=Array.from(this.canvas.nativeElement.parentElement!.querySelectorAll<HTMLElement>('.story-chapter'));
    const y=window.scrollY;
    this.scrollChapter=7;this.scrollPhase=0;
    for(let i=0;i<sections.length;i++){
      const start=sections[i].offsetTop;
      const end=i<7?sections[i+1].offsetTop:document.documentElement.scrollHeight-window.innerHeight;
      if(y<end||i===7){
        this.scrollChapter=i;this.scrollPhase=THREE.MathUtils.clamp((y-start)/Math.max(1,end-start),0,1);break;
      }
    }
    const stage=Math.min(7,this.scrollChapter+THREE.MathUtils.smoothstep(this.scrollPhase,.8,1));
    this.target=stage/7;
    if(this.fallback()){this.chapter.set(Math.round(stage));this.progress.set(Math.round(this.target*100));}
  };
  go(index:number):void{
    if(this.certificateDialog.nativeElement.open)return;
    const target=THREE.MathUtils.clamp(index,0,7);
    if(target>0)this.folderClue.set(false);
    this.menuOpen.set(false);this.exploreRoom.set(false);this.startMenuOpen.set(false);this.openedFolder.set(target===0?null:target);
    this.chapter.set(target);this.progress.set(0);
    const body=this.spatialPanels[target]?.element.querySelector<HTMLElement>('.monitor-content');body?.scrollTo({top:0});
    if(target>0&&this.motion())body?.animate([{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'ease-out'});
  }
  private certificateOverflow="";
  openCertificate(cert:string[]):void{
    this.selectedCertificate.set(cert);
    this.certificateOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    this.certificateDialog.nativeElement.show();
    this.certificateDialog.nativeElement.querySelector<HTMLButtonElement>('button')?.focus();
  }
  closeCertificate():void{
    this.certificateDialog.nativeElement.close();document.body.style.overflow=this.certificateOverflow;
  }
  dismissCertificateBackdrop(event:MouseEvent):void{
    const dialog=this.certificateDialog.nativeElement,rect=dialog.getBoundingClientRect();
    if(event.target===dialog&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom))this.closeCertificate();
  }
  openWorkVideo():void{this.workVideoDialog.nativeElement.show();this.workVideoDialog.nativeElement.querySelector<HTMLButtonElement>('button')?.focus();}
  closeWorkVideo():void{this.workVideoDialog.nativeElement.close();}
  dismissVideoBackdrop(event:MouseEvent):void{
    const dialog=this.workVideoDialog.nativeElement;
    const rect=dialog.getBoundingClientRect();
    if(event.target===dialog&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom))dialog.close();
  }
  toggleMotion():void{this.motion.update(value=>!value);}
  private key=(e:KeyboardEvent):void=>{
    if(this.certificateDialog.nativeElement.open){if(e.key==='Escape')this.closeCertificate();return;}
    if(this.workVideoDialog.nativeElement.open){if(e.key==='Escape')this.closeWorkVideo();return;}
    if(e.key==='Escape'){this.menuOpen.set(false);return;}
    if((e.target as HTMLElement)?.closest('button,a,input,video'))return;
    const d=['ArrowDown','ArrowRight','PageDown',' '].includes(e.key)?1:['ArrowUp','ArrowLeft','PageUp'].includes(e.key)?-1:0;
    if(d){e.preventDefault();this.go(this.chapter()+d);}
    if(e.key==='Home')this.go(0);if(e.key==='End')this.go(7);
  };
  private move=(e:PointerEvent):void=>{
    this.pointer.set(e.clientX/window.innerWidth-.5,e.clientY/window.innerHeight-.5);
    if(this.dragPoint&&this.exploreRoom()){
      this.roomYaw=THREE.MathUtils.clamp(this.roomYaw-(e.clientX-this.dragPoint.x)*.004,-.65,.65);
      this.roomPitch=THREE.MathUtils.clamp(this.roomPitch+(e.clientY-this.dragPoint.y)*.003,-.12,.4);
      this.dragPoint.set(e.clientX,e.clientY);
    }
  };
  private init():void{
    this.scene.background=new THREE.Color('#b5c4cc');this.scene.fog=new THREE.FogExp2('#b5c4cc',.008);
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas.nativeElement,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,window.innerWidth<=700?1.25:1.75));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
    this.scene.add(new THREE.HemisphereLight(0xe4f2ff,0x8b6348,2.6));
    const key=new THREE.DirectionalLight(0xffeed7,3);key.position.set(-3,8,10);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-14;key.shadow.camera.right=14;key.shadow.camera.top=12;key.shadow.camera.bottom=-8;key.shadow.bias=-.0005;key.shadow.normalBias=.025;this.scene.add(key);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(65,190),new THREE.MeshStandardMaterial({color:0x6d594b,roughness:.9,metalness:0}));
    floor.rotation.x=-Math.PI/2;floor.position.set(5,-3.4,-45);this.scene.add(floor);
    const wall=new THREE.Mesh(new THREE.PlaneGeometry(180,28),new THREE.MeshStandardMaterial({color:0xd1c2ad,roughness:.9}));
    wall.rotation.y=-Math.PI/2;wall.position.set(17,8,-45);this.scene.add(wall);
    for(let i=0;i<8;i++){
      const z=-i*18;
      const station=new THREE.Group();station.position.set([-1.8,3.2,-2.2,3.2,-2.2,3.2,-2.2,3.2][i],0,z);station.rotation.y=[.08,-.16,.12,-.12,.1,-.12,.1,-.1][i];this.scene.add(station);this.stations.push(station);
      const platform=new THREE.Mesh(new THREE.CylinderGeometry(5.2,5.4,.3,64),this.metal(0x101e38));platform.position.y=-3.2;if(i!==0)station.add(platform);
      const rim=new THREE.Mesh(new THREE.TorusGeometry(5.2,.035,6,100),new THREE.MeshBasicMaterial({color:0x3d88ff}));rim.rotation.x=Math.PI/2;rim.position.y=-3.02;if(i!==0)station.add(rim);
      const light=new THREE.PointLight(0xffdba8,20,24);light.position.set(5,3,z+4);this.scene.add(light);
    }
    this.stations.forEach(station=>this.buildDesk(station));this.buildWorkspace(this.stations[0]);
    this.scene.traverse(object=>{
      if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=true;}
      if(object instanceof THREE.Light)object.userData['dayIntensity']=object.intensity;
    });this.buildMilestones(this.stations[3]);this.buildLearning(this.stations[4]);this.buildProject(this.stations[5]);
    this.resize();this.zone.runOutsideAngular(()=>this.animate(0));
  }
  private buildWorkspace(group:THREE.Group):void{
    const matte=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.85,metalness:0});
    const solid=(w:number,h:number,d:number,x:number,y:number,z:number,color:number)=>{
      const m=this.box(group,w,h,d,x,y,z,color);m.material=matte(color);return m;
    };
    // Room architecture and a glazed window overlooking a quiet city.
    solid(22,12,.4,0,2,-6,0xd7c9b5);
    solid(.35,12,18,-10,2,2,0xd0c4b2);
    solid(15,7,.12,0,2,-5.7,0x9fbecb);
    for(let i=0;i<11;i++){
      const height=1.2+(i%4)*.6;
      solid(1.05,height,.15,-6.5+i*1.25,1.1,-5.55,i%2?0xa0acb1:0x85959f);
    }
    solid(15,2.2,.08,0,-.6,-5.3,0xb7ced9);
    for(const x of [-7.5,-3.75,0,3.75,7.5])solid(.14,7.3,.28,x,2,-5.1,0x815d3b);
    for(const y of [-1.6,2,5.6])solid(15.2,.16,.28,0,y,-5.1,0x815d3b);
    solid(15.7,.2,.8,0,-1.7,-5,0x936b46);
    // Left bookshelf with books and small objects.
    for(const x of [-8,-5.9])solid(.16,7,1,x,.7,-2.8,0x493f35);
    for(const y of [-2.5,-.9,.7,2.3,3.9])solid(1.92,.12,.9,-6.95,y,-2.8,0x69513b);
    for(let i=0;i<12;i++)solid(.18,.7+(i%3)*.16,.55,-7.8+(i%6)*.28,i<6?-.48:2.82,-2.7,[0x536b77,0xc2a477,0xe0d6c2,0x7e5847][i%4]);
    const cylinder=(radius:number,height:number,x:number,y:number,z:number,color:number)=>{
      const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius*.85,height,24),matte(color));m.position.set(x,y,z);group.add(m);return m;
    };
    // Plant, notebook and ceramic coffee cup on the wooden desk.
    cylinder(.3,.55,-4.1,-.64,-.6,0xe4dcc9);
    for(let i=0;i<8;i++){
      const leaf=new THREE.Mesh(new THREE.SphereGeometry(.2,12,8),matte(i%2?0x426744:0x69804b));
      leaf.scale.set(.5,2.6,.28);leaf.rotation.z=(i-3.5)*.22;
      leaf.position.set(-4.1+Math.sin(i)*.18,-.02+(i%3)*.15,-.6+Math.cos(i)*.15);group.add(leaf);
    }
    solid(1.1,.1,.75,-3.5,-.85,.8,0x334d59);solid(1,.035,.68,-3.5,-.78,.8,0xe5ddc7);
    cylinder(.23,.32,3.65,-.75,.9,0xede7da);
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.16,.04,8,20),matte(0xede7da));handle.position.set(3.9,-.73,.9);group.add(handle);
    cylinder(.35,.04,3.65,-.91,.9,0xe1d7c5);
    // Articulated desk lamp with a warm pool of light.
    cylinder(.35,.07,4.5,-.87,-.9,0x4b514f);
    const baseJoint=new THREE.Vector3(4.5,-.83,-.9),elbow=new THREE.Vector3(4.65,.45,-.9);
    const shadePosition=new THREE.Vector3(4.1,1.25,-.9);
    const shadeRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),.4);
    const shadeJoint=new THREE.Vector3(0,.19,0).applyQuaternion(shadeRotation).add(shadePosition);
    for(const [from,to] of [[baseJoint,elbow],[elbow,shadeJoint]]){
      const direction=to.clone().sub(from);
      const arm=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,direction.length(),12),matte(0x5d6869));
      arm.position.copy(from).add(to).multiplyScalar(.5);
      arm.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());group.add(arm);
    }
    for(const point of [elbow,shadeJoint]){
      const joint=new THREE.Mesh(new THREE.SphereGeometry(.075,12,8),matte(0x46514f));joint.position.copy(point);group.add(joint);
    }
    const shade=new THREE.Mesh(new THREE.ConeGeometry(.43,.38,24,1,true),new THREE.MeshStandardMaterial({color:0x62716e,roughness:.7,side:THREE.DoubleSide}));
    shade.quaternion.copy(shadeRotation);shade.position.copy(shadePosition);group.add(shade);
    const diffuser=new THREE.Mesh(new THREE.CircleGeometry(.38,24),new THREE.MeshStandardMaterial({color:0xffefd0,emissive:0xffd692,emissiveIntensity:.7,side:THREE.DoubleSide}));
    diffuser.rotation.x=Math.PI/2;diffuser.quaternion.premultiply(shadeRotation);
    diffuser.position.copy(new THREE.Vector3(0,-.17,0).applyQuaternion(shadeRotation).add(shadePosition));group.add(diffuser);
    const bulb=new THREE.PointLight(0xffdca4,14,5);bulb.position.copy(diffuser.position);group.add(bulb);
    // A wall-mounted rocker switch is part of the room geometry.
    solid(.65,.95,.12,9,.3,-5.45,0xe9e4d9);
    this.switchRocker=solid(.3,.52,.1,9,.3,-5.34,0xf8f5ed);
    group.updateMatrixWorld();this.switchPosition.copy(group.localToWorld(new THREE.Vector3(9,.3,-5.25)));
    // Right-hand framed prints complete the workspace.
    for(const y of [1.8,3.7]){solid(1.4,1.4,.15,9,y,-5.6,0x70553b);solid(1.2,1.2,.06,9,y,-5.49,0xeee7d9);solid(.5,.05,.03,9,y,-5.43,0x899686);}
  }
  private metal(color=0x162949):THREE.MeshStandardMaterial{return new THREE.MeshStandardMaterial({color,metalness:.65,roughness:.28});}
  private box(group:THREE.Group,w:number,h:number,d:number,x:number,y:number,z:number,color=0x162949):THREE.Mesh{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.metal(color));mesh.position.set(x,y,z);group.add(mesh);return mesh;
  }
  private screen(title:string,lines:string[],width=5.5,height=3.4):THREE.Group{
    const group=new THREE.Group();group.userData['monitor']=true;this.box(group,width,height,.18,0,0,0,0x1c3051);
    const c=document.createElement('canvas');c.width=1024;c.height=640;const ctx=c.getContext('2d')!;
    ctx.fillStyle='#071326';ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle='#142e50';ctx.fillRect(0,0,c.width,65);
    ['#5daaff','#839dc1','#839dc1'].forEach((color,i)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(28+i*25,33,6,0,Math.PI*2);ctx.fill();});
    ctx.font='20px monospace';ctx.fillStyle='#acccf5';ctx.fillText(title,135,40);
    ctx.font='25px monospace';lines.forEach((line,i)=>{ctx.fillStyle=i%3===0?'#75b9ff':'#d5e6fc';ctx.fillText(line,45,135+i*51);});
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;this.textures.push(texture);
    const display=new THREE.Mesh(new THREE.PlaneGeometry(width-.17,height-.17),new THREE.MeshBasicMaterial({map:texture}));display.position.z=.101;group.add(display);return group;
  }
  private buildDesk(group:THREE.Group):void{
    const desk=this.box(group,11,.25,4.4,0,-1.05,0,0xa57443);
    (desk.material as THREE.MeshStandardMaterial).metalness=0;(desk.material as THREE.MeshStandardMaterial).roughness=.8;
    const woodCanvas=document.createElement('canvas');woodCanvas.width=512;woodCanvas.height=128;
    const wood=woodCanvas.getContext('2d')!;wood.fillStyle='#ad875b';wood.fillRect(0,0,512,128);
    for(let i=0;i<180;i++){wood.strokeStyle=`rgba(80,45,15,${.025+(i%5)*.012})`;wood.beginPath();const y=i*.8;wood.moveTo(0,y);wood.bezierCurveTo(170,y+Math.sin(i)*2,340,y-2,512,y+1);wood.stroke();}
    const woodTexture=new THREE.CanvasTexture(woodCanvas);woodTexture.colorSpace=THREE.SRGBColorSpace;this.textures.push(woodTexture);(desk.material as THREE.MeshStandardMaterial).map=woodTexture;(desk.material as THREE.MeshStandardMaterial).color.setHex(0xffffff);
    desk.rotation.y=-.12;
    for(const x of [-3.2,3.2])this.box(group,.15,1.4,3,x,-1.85,0);
    const monitor=this.screen('jouhara / workspace',['const developer = {','  name: "Jouhara NK",','  role: "Full stack developer",','  approach: "build with care"','};','','> let’s build something meaningful']);
    monitor.position.set(0,.6,-.6);monitor.rotation.y=-.12;group.add(monitor);
    this.box(group,.22,1.1,.25,0,-1.1,-.7);this.box(group,1.5,.08,.8,0,-1.5,-.5);
    const keyboard=new THREE.Group();this.box(keyboard,4.8,.12,1.4,0,0,0,0x09162c);
    const keyGeometry=new THREE.BoxGeometry(.27,.055,.24),keyMaterial=this.metal(0x56616b);
    const legends=[
      ['Esc','1','2','3','4','5','6','7','8','9','0','−','=','⌫'],
      ['Tab','Q','W','E','R','T','Y','U','I','O','P','[',']','\\'],
      ['Caps','A','S','D','F','G','H','J','K','L',';',"'",'↵','Home'],
      ['Ctrl','Shift','Z','X','C','V','B','N','M',',','.','/','↑','→']
    ];
    const keyCanvas=document.createElement('canvas');keyCanvas.width=1400;keyCanvas.height=400;
    const ink=keyCanvas.getContext('2d')!;ink.fillStyle='#edf3f6';ink.textAlign='center';ink.textBaseline='middle';
    legends.forEach((row,r)=>row.forEach((label,c)=>{ink.font=`${label.length>2?23:36}px Arial`;ink.fillText(label,c*100+50,r*100+50);}));
    const keyTexture=new THREE.CanvasTexture(keyCanvas);keyTexture.colorSpace=THREE.SRGBColorSpace;this.textures.push(keyTexture);
    const legendMaterial=new THREE.MeshBasicMaterial({map:keyTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
    for(let row=0;row<4;row++)for(let col=0;col<14;col++){
      const x=col*.32-2.1,z=row*.29-.43;
      const k=new THREE.Mesh(keyGeometry,keyMaterial);k.position.set(x,.08,z);keyboard.add(k);
      const face=new THREE.PlaneGeometry(.245,.21),uv=face.getAttribute('uv');
      for(let i=0;i<uv.count;i++)uv.setXY(i,(col+uv.getX(i))/14,1-(row+1-uv.getY(i))/4);
      const label=new THREE.Mesh(face,legendMaterial);label.rotation.x=-Math.PI/2;label.position.set(x,.109,z);keyboard.add(label);
    }
    keyboard.scale.set(.85,1,.85);keyboard.position.set(-.2,-.84,.7);keyboard.rotation.y=-.12;group.add(keyboard);
    const mouse=new THREE.Mesh(new THREE.SphereGeometry(.4,20,12),new THREE.MeshStandardMaterial({color:0x343f46,roughness:.6}));mouse.scale.set(.7,.3,1.1);mouse.position.set(2.65,-.82,.8);group.add(mouse);
    const lamp=new THREE.PointLight(0xffdbab,8,8);lamp.position.set(0,1.8,1);group.add(lamp);
  }
  private buildLayers(group:THREE.Group):void{
    const names=['TOOLKIT / 01','TOOLKIT / 02','TOOLKIT / 03'];
    const lines=[['Angular · React','TypeScript · JavaScript','HTML · CSS · SCSS'],['Node.js · Express','Python · Django','Java'],['PostgreSQL · MongoDB','MySQL · SQL · WordPress','Data that connects everything']];
    names.forEach((name,i)=>{
      const layer=this.screen(name,lines[i],5.5,2.0);layer.position.set((i-1)*.4,(1-i)*1.75,-i*.8);layer.rotation.y=-.2;layer.userData['index']=i;group.add(layer);this.layers.push(layer);
    });
  }
  private buildMilestones(group:THREE.Group):void{
    const entries=[['2017','Web Developer Trainee','Webgyor Communications'],['2022','Full-stack Developer Trainee','Itvedant Education'],['2024','Full Stack Software Developer','KnoDTec Solutions']];
    entries.forEach((entry,i)=>{const g=this.screen('CAREER / '+entry[0],entry.slice(1),3.5,2.5);g.position.set((i-1)*3.1,-.2+i*.8,-i*1.2);g.rotation.y=-.12;group.add(g);this.box(group,.12,2.2,.12,(i-1)*3.1,-1.9,-i*1.2,0x387cf1);this.milestones.push(g);});
  }
  private buildLearning(group:THREE.Group):void{
    const book=this.screen('LEARNING / 2013—2017',['B.Tech. / Information Technology','Cochin University of Science','and Technology','','9 certifications','A commitment to keep learning'],6,4);
    book.position.y=.5;book.rotation.y=-.22;group.add(book);
    for(let i=0;i<5;i++)this.box(group,2.6,.18,1.8,2.5,-2.5+i*.22,1.2,0x183155+i*0x04080c);
  }
  private buildProject(group:THREE.Group):void{
    const project=this.screen('SELECTED WORK / DCHR.IN',['DCHR','www.dchr.in','','A live website','','Explore the work online.'],7,4.4);
    project.position.y=.4;project.rotation.y=-.14;group.add(project);this.box(group,.35,1.5,.4,0,-2.3,-.2);
  }
  private buildContact(group:THREE.Group):void{
    const portal=new THREE.Group();
    const material=new THREE.MeshStandardMaterial({color:0x70b0ff,emissive:0x164dbd,emissiveIntensity:.8,metalness:.65,roughness:.25});
    for(let i=0;i<3;i++){const shape=new THREE.Mesh(new THREE.TorusGeometry(2.6+i*.25,.075,12,80),material);shape.rotation.set(i*.55,i*.65,.2);portal.add(shape);}
    const core=new THREE.Mesh(new THREE.IcosahedronGeometry(1.5,2),this.metal(0x3b7cec));portal.add(core);portal.position.y=.3;group.add(portal);this.orbit=portal;
  }
  private initSpatialContent():void{
    this.spatialRenderer=new CSS3DRenderer();
    this.spatialRenderer.domElement.className='spatial-layer';
    this.canvas.nativeElement.parentElement!.appendChild(this.spatialRenderer.domElement);
    // Safari can miss clicks on buttons inside a perspective-transformed screen.
    // Resolve the maximize hit area before the screen changes size.
    let maximizePointerTime=0;
    this.spatialRenderer.domElement.addEventListener('pointerdown',event=>{
      if(event.button!==0||this.exploreRoom()||this.booting())return;
      const index=this.openedFolder();
      if(index===null)return;
      const button=this.spatialPanels[index]?.element.querySelector<HTMLButtonElement>('.folder-maximize');
      if(!button)return;
      const rect=button.getBoundingClientRect();
      if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)return;
      event.preventDefault();event.stopPropagation();
      maximizePointerTime=performance.now();
      this.zone.run(()=>this.toggleMaximize(index));
    },true);
    this.spatialRenderer.domElement.addEventListener('click',event=>{
      if(performance.now()-maximizePointerTime<500){event.preventDefault();event.stopImmediatePropagation();}
    },true);
    this.spatialRenderer.domElement.addEventListener('click',event=>{
      if((event.target as HTMLElement).closest('button,a'))return;
      const panel=this.spatialPanels.find(p=>p.element.style.visibility==='visible'&&p.element.style.pointerEvents==='auto');
      const control=Array.from(panel?.element.querySelectorAll<HTMLElement>('button,a')??[]).find(element=>{const r=element.getBoundingClientRect();return event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom;});
      if(control)this.zone.run(()=>control.click());
    });
    const sections=Array.from(this.canvas.nativeElement.parentElement!.querySelectorAll<HTMLElement>('.story-chapter'));
    sections.forEach((section,i)=>{
      const content=section.querySelector<HTMLElement>('.content,.intro')!;
      const screen=document.createElement('div');screen.className='scene-panel';
      if(i>0){
        const toolbar=document.createElement('div');toolbar.className='folder-window-bar';
        const title=document.createElement('span');title.textContent=this.chapters[i];
        const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','Close folder');
        close.addEventListener('click',()=>this.zone.run(()=>{this.maximized.set(false);this.go(0);}));
        const controls=document.createElement('div');controls.className='folder-window-controls';
        const minimize=document.createElement('button');minimize.textContent='−';minimize.setAttribute('aria-label','Minimize folder');
        minimize.addEventListener('click',()=>this.zone.run(()=>{this.maximized.set(false);this.go(0);}));
        const maximize=document.createElement('button');maximize.className='folder-maximize';maximize.textContent='□';maximize.setAttribute('aria-label','Maximize folder');maximize.title='Maximize';maximize.addEventListener('click',event=>{event.stopPropagation();this.zone.run(()=>this.toggleMaximize(i));});controls.append(minimize,maximize,close);
        toolbar.append(title,controls);screen.appendChild(toolbar);
        const navigation=document.createElement('nav');navigation.className='folder-navigation';navigation.setAttribute('aria-label','Browse portfolio folders');
        const previous=document.createElement('button');previous.textContent='←';previous.setAttribute('aria-label','Back to '+(i===1?'Desktop':this.chapters[i-1]));previous.title=i===1?'Back to Desktop':'Back to '+this.chapters[i-1];previous.addEventListener('click',()=>this.zone.run(()=>this.go(i-1)));
        const next=document.createElement('button');next.textContent='→';next.setAttribute('aria-label','Forward to '+(this.chapters[i+1]??'next folder'));next.title=i<7?'Forward to '+this.chapters[i+1]:'No next folder';next.disabled=i===7;next.addEventListener('click',()=>this.zone.run(()=>this.go(i+1)));
        const address=document.createElement('div');address.className='folder-address';address.textContent='📁 Desktop  ›  '+this.chapters[i];
        navigation.append(previous,next,address);

        screen.appendChild(navigation);
      }
      const body=document.createElement('div');body.className='monitor-content';body.appendChild(content);screen.appendChild(body);
      const preview=document.createElement('div');preview.className='monitor-preview';preview.textContent=this.chapters[i];screen.appendChild(preview);
      const object=new CSS3DObject(screen);
      this.spatialPanels.push(object);this.spatialScene.add(object);
      const monitor=new THREE.Group();
      const bezel=this.box(monitor,1,1,1,0,0,-20,0x26343f);
      (bezel.material as THREE.MeshStandardMaterial).emissive.setHex(0x153767);
      (bezel.material as THREE.MeshStandardMaterial).emissiveIntensity=.35;
      this.box(monitor,80,220,35,0,-100, -65,0x203858);
      this.box(monitor,260,18,150,0,-210,-25,0x162b48);
      this.scene.add(monitor);this.contentMonitors.push(monitor);
    });
    this.spatialPanels[4].element.appendChild(this.certificateDialog.nativeElement);
    this.spatialPanels[1].element.appendChild(this.workVideoDialog.nativeElement);
    this.stations.forEach((station,i)=>station.visible=i===0);
    this.scene.traverse(object=>{if(object.userData['monitor'])object.visible=false;});
    this.spatialRenderer.render(this.spatialScene,this.camera);
    (this.spatialRenderer.domElement.firstElementChild as HTMLElement).style.display='none';
    this.spatialPanels.forEach(panel=>this.spatialRenderer!.domElement.appendChild(panel.element));
    this.navigationClue=document.createElement('div');this.navigationClue.className='outside-navigation-clue';this.navigationClue.setAttribute('aria-hidden','true');this.navigationClue.innerHTML='<span>Back or next<br>to explore</span><svg viewBox="0 0 90 65"><path d="M8 8C48 2 22 49 80 54M68 44l12 10-16 7"/></svg>';this.spatialRenderer.domElement.appendChild(this.navigationClue);
    this.resizeSpatialContent();
  }
  toggleMaximize(index:number):void{
    const panel=this.spatialPanels[index];
    if(!panel||index===0)return;
    const body=panel.element.querySelector<HTMLElement>('.monitor-content');
    const scrollTop=body?.scrollTop??0;
    // The clicked window owns the action, even immediately after changing folders.
    this.openedFolder.set(index);
    this.exploreRoom.set(false);
    this.maximized.update(value=>!value);
    this.spatialPanels.forEach(object=>this.projectDisplay(object));
    if(body)body.scrollTop=scrollTop;
  }
  private resizeSpatialContent():void{
    const mobile=window.innerWidth<=900;
    this.spatialRenderer?.setSize(window.innerWidth,window.innerHeight);
    this.spatialPanels.forEach((object,i)=>{
      const panel=object.element;
      panel.classList.remove('folder-maximized');
      const displayPixels=Math.min(window.innerWidth*(mobile?.90:.68),window.innerHeight*.56*(mobile?1.1:1.6));
      panel.style.width=`${displayPixels}px`;
      panel.style.height=`${displayPixels/(mobile?1.1:1.6)}px`;
      const monitor=this.contentMonitors[i];
      monitor.children[0].scale.set(panel.offsetWidth+28,panel.offsetHeight+28,38);
      monitor.children[1].scale.y=.4;
      monitor.children[1].position.y=-panel.offsetHeight/2-44;
      monitor.children[2].scale.x=.65;
      monitor.children[2].position.y=-panel.offsetHeight/2-90;
      const section=this.canvas.nativeElement.parentElement!.querySelector<HTMLElement>(`[data-chapter="${i}"]`)!;
      section.style.height=`${Math.max(window.innerHeight*1.8,panel.scrollHeight+window.innerHeight*1.2)}px`;
    });
  }
  private monitorPose(index:number):{position:THREE.Vector3;rotation:THREE.Quaternion}{
    const mobile=window.innerWidth<=900,station=this.stations[0];
    station.updateMatrixWorld();
    return {position:station.localToWorld(new THREE.Vector3(0,mobile?.8:1.3,-.49)),rotation:station.quaternion.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0,-.12,0)))};
  }
  private overviewPose(index:number):{position:THREE.Vector3;rotation:THREE.Quaternion}{
    const pose=this.monitorPose(index),mobile=window.innerWidth<=900;
    const position=pose.position.clone().add(new THREE.Vector3(mobile?1.5:-6,2,mobile?14:13).applyQuaternion(pose.rotation));
    const rotation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(position,pose.position,new THREE.Vector3(0,1,0)));
    return {position,rotation};
  }
  private renderSpatialContent(dt:number):void{
    if(!this.spatialRenderer)return;
    const mobile=window.innerWidth<=900,h=window.innerHeight;
    const index=this.booting()?0:(this.openedFolder()??0);
    this.panelStage=index+.25;
    const bootApproach=this.bootStarted()?(this.motion()?THREE.MathUtils.smoothstep((performance.now()-this.bootStart)/1800,0,1):1):0;
    const approach=mobile?1:(this.booting()?bootApproach:1);
    const screen=this.spatialPanels[index].element;
    if(this.desktopTaskbar.nativeElement.parentElement!==screen)screen.appendChild(this.desktopTaskbar.nativeElement);
    this.desktopTaskbar.nativeElement.style.display=this.booting()?'none':'flex';
    const pose=this.monitorPose(index),overview=this.overviewPose(index);
    const screenWidth=parseFloat(screen.style.width),screenHeight=parseFloat(screen.style.height);
    const worldWidth=mobile?2.8:5.5,scale=worldWidth/screenWidth;
    const distance=worldWidth*(h*.5*this.camera.projectionMatrix.elements[5])/screenWidth;
    const readPosition=pose.position.clone().add(new THREE.Vector3(0,-screenHeight*scale*.12,distance).applyQuaternion(pose.rotation));
    const position=overview.position.clone().lerp(readPosition,approach);
    const rotation=overview.rotation.clone().slerp(pose.rotation,approach);
    this.roomBlend=THREE.MathUtils.lerp(this.roomBlend,this.exploreRoom()?1:0,1-Math.exp(-dt*7));
    this.smoothPointer.lerp(this.pointer,1-Math.exp(-dt*5));
    if(!this.booting()&&!this.shutDown()){
      const orbitOffset=new THREE.Vector3(Math.sin(this.roomYaw)*distance*this.roomZoom,Math.sin(this.roomPitch)*distance*this.roomZoom,Math.cos(this.roomYaw)*distance*this.roomZoom).applyQuaternion(pose.rotation);
      const orbitPosition=pose.position.clone().add(orbitOffset);
      // Keep exploration inside the room, away from the walls and floor.
      const room=this.stations[0],localCamera=room.worldToLocal(orbitPosition.clone());
      localCamera.x=THREE.MathUtils.clamp(localCamera.x,-8.4,8.4);
      localCamera.y=THREE.MathUtils.clamp(localCamera.y,-.3,6.5);
      localCamera.z=Math.max(localCamera.z,1.8);
      position.lerp(room.localToWorld(localCamera),this.roomBlend);
      if(this.motion()&&this.openedFolder()===null&&!this.exploreRoom())position.add(new THREE.Vector3(this.smoothPointer.x*.55,-this.smoothPointer.y*.25,0).applyQuaternion(pose.rotation));
      const lookRotation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(position,pose.position,new THREE.Vector3(0,1,0)));
      rotation.slerp(lookRotation,this.roomBlend||((this.motion()&&this.openedFolder()===null)?.75:0));
    }
    this.camera.position.copy(position);this.camera.quaternion.copy(rotation);this.camera.updateMatrixWorld();
    this.lightLevel=THREE.MathUtils.lerp(this.lightLevel,this.roomLightOn()?1:0,1-Math.exp(-dt*5));
    this.scene.traverse(object=>{
      if(object instanceof THREE.Light&&object.userData['dayIntensity']!==undefined)object.intensity=object.userData['dayIntensity']*(.05+.95*this.lightLevel);
    });
    (this.scene.background as THREE.Color).setRGB(.025+.685*this.lightLevel,.035+.735*this.lightLevel,.065+.735*this.lightLevel);
    if(this.switchRocker)this.switchRocker.rotation.x=this.roomLightOn()?-.18:.18;
    const switchPoint=this.switchPosition.clone().project(this.camera);
    const switchButton=this.wallSwitch.nativeElement;
    const switchRight=this.switchPosition.clone().add(new THREE.Vector3(.325,0,0)).project(this.camera);
    const switchTop=this.switchPosition.clone().add(new THREE.Vector3(0,.475,0)).project(this.camera);
    switchButton.style.left=`${(switchPoint.x+1)*window.innerWidth/2}px`;
    switchButton.style.top=`${(1-switchPoint.y)*window.innerHeight/2}px`;
    switchButton.style.width=`${Math.max(18,Math.abs(switchRight.x-switchPoint.x)*window.innerWidth)}px`;
    switchButton.style.height=`${Math.max(25,Math.abs(switchTop.y-switchPoint.y)*window.innerHeight)}px`;
    switchButton.style.visibility=this.booting()||this.shutDown()||Math.abs(switchPoint.x)>1||Math.abs(switchPoint.y)>1?'hidden':'visible';
    this.spatialPanels.forEach((object,i)=>{
      const panel=object.element,monitor=this.contentMonitors[i],screenPose=this.monitorPose(i);
      const panelScale=(mobile?2.8:5.5)/parseFloat(panel.style.width);
      object.position.copy(screenPose.position);object.quaternion.copy(screenPose.rotation);object.scale.setScalar(panelScale);
      monitor.position.copy(screenPose.position);monitor.quaternion.copy(screenPose.rotation);monitor.scale.setScalar(panelScale);monitor.visible=i===index;
      panel.style.visibility=i===index?'visible':'hidden';
      panel.style.opacity='1';panel.style.pointerEvents=i===index&&approach>.95&&!this.exploreRoom()?'auto':'none';panel.inert=i!==index||this.exploreRoom();
      const body=panel.querySelector<HTMLElement>('.monitor-content')!;
      body.inert=(i===4&&this.certificateDialog.nativeElement.open)||(i===1&&this.workVideoDialog.nativeElement.open);
      body.style.transform='none';
      body.style.opacity='1';panel.querySelector<HTMLElement>('.monitor-preview')!.style.display='none';
    });
    this.spatialPanels.forEach(object=>this.projectDisplay(object));
  }
  private projectDisplay(object:CSS3DObject):void{
    const element=object.element,isMaximized=this.maximized()&&object===this.spatialPanels[this.openedFolder()??0]&&this.openedFolder()!==null;
    element.classList.toggle('folder-maximized',isMaximized);
    const maximize=element.querySelector<HTMLButtonElement>('.folder-maximize');
    if(maximize){maximize.textContent=isMaximized?'❐':'□';maximize.setAttribute('aria-label',isMaximized?'Restore folder':'Maximize folder');maximize.title=isMaximized?'Restore':'Maximize';}
    if(isMaximized){element.style.transform='none';element.style.zIndex='30';if(this.navigationClue)this.navigationClue.style.display='none';return;}
    element.style.zIndex='';
    const width=element.offsetWidth,height=element.offsetHeight;
    const corners=[[-width/2,height/2],[width/2,height/2],[width/2,-height/2],[-width/2,-height/2]].map(([x,y])=>{
      const p=new THREE.Vector3(x*object.scale.x,y*object.scale.y,0).applyQuaternion(object.quaternion).add(object.position).project(this.camera);
      return [(p.x+1)*window.innerWidth/2,(1-p.y)*window.innerHeight/2];
    });
    const [p0,p1,p2,p3]=corners;
    if(this.navigationClue&&object===this.spatialPanels[this.openedFolder()??0]){
      const clue=this.navigationClue,mobile=window.innerWidth<=900;
      clue.style.display=this.openedFolder()!==null&&!this.exploreRoom()&&!this.booting()?'block':'none';
      clue.style.left=`${mobile?p0[0]+8:Math.max(8,p0[0]-155)}px`;clue.style.top=`${mobile?p0[1]-94:p0[1]-35}px`;
    }
    const dx1=p1[0]-p2[0],dx2=p3[0]-p2[0],dx3=p0[0]-p1[0]+p2[0]-p3[0];
    const dy1=p1[1]-p2[1],dy2=p3[1]-p2[1],dy3=p0[1]-p1[1]+p2[1]-p3[1];
    const denominator=dx1*dy2-dx2*dy1;
    const g=Math.abs(denominator)>1e-8?(dx3*dy2-dx2*dy3)/denominator:0;
    const q=Math.abs(denominator)>1e-8?(dx1*dy3-dx3*dy1)/denominator:0;
    const a=(p1[0]-p0[0]+g*p1[0])/width,b=(p3[0]-p0[0]+q*p3[0])/height;
    const d=(p1[1]-p0[1]+g*p1[1])/width,e=(p3[1]-p0[1]+q*p3[1])/height;
    element.style.transform=`matrix3d(${a},${d},0,${g/width},${b},${e},0,${q/height},0,0,1,0,${p0[0]},${p0[1]},0,1)`;
    const forward=new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion);
    if(object.position.clone().sub(this.camera.position).dot(forward)<=0)element.style.visibility='hidden';
  }
  private animate=(time:number):void=>{
    this.frame=requestAnimationFrame(this.animate);
    const dt=Math.min((time-this.lastTime)/1000,.05);this.lastTime=time;
    this.current=THREE.MathUtils.lerp(this.current,this.target,this.motion()?1-Math.exp(-dt*4):1);
    const stage=this.current*6,index=Math.min(5,Math.floor(stage)),t=THREE.MathUtils.smoothstep(stage-index,0,1);
    const pos=this.positions[index].clone().lerp(this.positions[index+1],t);
    if(this.motion()){pos.x+=this.pointer.x*.28;pos.y-=this.pointer.y*.15;}
    this.camera.position.copy(pos);this.camera.lookAt(window.innerWidth<=900?5.6:1.5,.1,pos.z-19);
    const active=this.openedFolder()??0,percent=0;

    if(active!==this.chapter()||percent!==this.progress())this.zone.run(()=>{this.chapter.set(active);this.progress.set(percent);});
    // The stack separates as the camera approaches it, then settles into three readable layers.
    const assembly=THREE.MathUtils.smoothstep(stage,1.15,2);
    this.layers.forEach((layer,i)=>{layer.position.y=(1-i)*THREE.MathUtils.lerp(.3,2.2,assembly);layer.position.x=(i-1)*THREE.MathUtils.lerp(.08,.6,assembly);layer.rotation.z=(i-1)*.045*assembly;});
    this.milestones.forEach((m,i)=>{m.position.y=THREE.MathUtils.lerp(-2.5,-.2+i*.8,THREE.MathUtils.smoothstep(stage,2.3+i*.15,2.8+i*.15));});
    if(this.motion()&&this.orbit)this.orbit.rotation.y=time*.00017;
    this.renderSpatialContent(dt);
    this.renderer?.render(this.scene,this.camera);
  };
  private resize=():void=>{
    const width=window.innerWidth,height=window.innerHeight,mobile=width<=900;
    this.camera.aspect=width/height;this.camera.fov=46;
    this.camera.zoom=1;
    this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();this.renderer?.setPixelRatio(Math.min(window.devicePixelRatio,2));this.renderer?.setSize(width,height);this.resizeSpatialContent();this.syncScroll();
  };
  ngOnDestroy():void{
    clearTimeout(this.bootTimer);this.bootSound?.pause();
    if(this.booting()||this.shutDown())document.body.style.overflow=this.previousOverflow;
    window.removeEventListener('pointerdown',this.beginDrag);window.removeEventListener('pointerup',this.endDrag);window.removeEventListener('wheel',this.roomWheel);
    if(this.switchAudio&&this.switchAudio.state!=='closed')void this.switchAudio.close();
    document.removeEventListener('click',this.closeStartOutside);
    cancelAnimationFrame(this.frame);window.removeEventListener('scroll',this.syncScroll);window.removeEventListener('keydown',this.key);window.removeEventListener('pointermove',this.move);window.removeEventListener('resize',this.resize);
    this.scene.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>m.dispose());}});
    this.spatialRenderer?.domElement.remove();
    this.textures.forEach(t=>t.dispose());this.renderer?.dispose();
  }
}
