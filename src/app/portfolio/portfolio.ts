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
  readonly shutDown=signal(false);
  shutdown():void{
    this.shutDown.set(true);this.menuOpen.set(false);
    this.previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  }
  restart():void{
    this.shutDown.set(false);this.bootStarted.set(false);this.booting.set(true);
    this.bootStart=0;this.panelStage=0;this.scrollChapter=0;this.scrollPhase=0;
    window.scrollTo({top:0,behavior:'instant'});
    this.startBoot();
  }
  private bootTimer?:ReturnType<typeof setTimeout>;
  private bootStart=0;
  private bootSound?:HTMLAudioElement;
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
    document.body.style.overflow=this.previousOverflow;
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
  private spatialPanels:CSS3DObject[]=[];
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
    window.addEventListener('scroll',this.syncScroll,{passive:true});
    this.syncScroll();
    if(this.booting()){
      this.previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
      window.scrollTo({top:0,behavior:'instant'});
    }
    window.addEventListener('keydown',this.key);
    window.addEventListener('pointermove',this.move);

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
    this.menuOpen.set(false);
    const section=this.canvas.nativeElement.parentElement?.querySelector<HTMLElement>(`[data-chapter="${target}"]`);
    if(section){
      const available=target===7?document.documentElement.scrollHeight-window.innerHeight-section.offsetTop:section.offsetHeight;
      window.scrollTo({top:section.offsetTop+(target?available*.25:0),behavior:this.motion()?'smooth':'instant'});
    }
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
  openWorkVideo():void{this.workVideoDialog.nativeElement.showModal();}
  dismissVideoBackdrop(event:MouseEvent):void{
    const dialog=this.workVideoDialog.nativeElement;
    const rect=dialog.getBoundingClientRect();
    if(event.target===dialog&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom))dialog.close();
  }
  toggleMotion():void{this.motion.update(value=>!value);}
  private key=(e:KeyboardEvent):void=>{
    if(this.certificateDialog.nativeElement.open){if(e.key==='Escape')this.closeCertificate();return;}
    if(this.workVideoDialog.nativeElement.open)return;
    if(e.key==='Escape'){this.menuOpen.set(false);return;}
    if((e.target as HTMLElement)?.closest('button,a,input,video'))return;
    const d=['ArrowDown','ArrowRight','PageDown',' '].includes(e.key)?1:['ArrowUp','ArrowLeft','PageUp'].includes(e.key)?-1:0;
    if(d){e.preventDefault();this.go(this.chapter()+d);}
    if(e.key==='Home')this.go(0);if(e.key==='End')this.go(7);
  };
  private move=(e:PointerEvent):void=>{this.pointer.set(e.clientX/window.innerWidth-.5,e.clientY/window.innerHeight-.5);};
  private init():void{
    this.scene.background=new THREE.Color('#030712');this.scene.fog=new THREE.FogExp2('#030712',.022);
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas.nativeElement,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,window.innerWidth<=700?1.25:1.75));
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
    this.scene.add(new THREE.HemisphereLight(0x9ec8ff,0x0b1324,2.4));
    const key=new THREE.DirectionalLight(0xdceaff,3);key.position.set(-3,8,10);this.scene.add(key);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(65,190),new THREE.MeshStandardMaterial({color:0x07101f,roughness:.35,metalness:.5}));
    floor.rotation.x=-Math.PI/2;floor.position.set(5,-3.4,-45);this.scene.add(floor);
    const wall=new THREE.Mesh(new THREE.PlaneGeometry(180,28),new THREE.MeshStandardMaterial({color:0x050d1c,roughness:.6}));
    wall.rotation.y=-Math.PI/2;wall.position.set(17,8,-45);this.scene.add(wall);
    for(let i=0;i<8;i++){
      const z=-i*18;
      const station=new THREE.Group();station.position.set([-1.8,3.2,-2.2,3.2,-2.2,3.2,-2.2,3.2][i],0,z);station.rotation.y=[.08,-.16,.12,-.12,.1,-.12,.1,-.1][i];this.scene.add(station);this.stations.push(station);
      const platform=new THREE.Mesh(new THREE.CylinderGeometry(5.2,5.4,.3,64),this.metal(0x101e38));platform.position.y=-3.2;station.add(platform);
      const rim=new THREE.Mesh(new THREE.TorusGeometry(5.2,.035,6,100),new THREE.MeshBasicMaterial({color:0x3d88ff}));rim.rotation.x=Math.PI/2;rim.position.y=-3.02;station.add(rim);
      const light=new THREE.PointLight(0x367aff,100,24);light.position.set(5,3,z+4);this.scene.add(light);
    }
    this.stations.forEach(station=>this.buildDesk(station));this.buildMilestones(this.stations[3]);this.buildLearning(this.stations[4]);this.buildProject(this.stations[5]);
    this.resize();this.zone.runOutsideAngular(()=>this.animate(0));
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
    const desk=this.box(group,8,.25,4.4,0,-1.05,0,0x14243d);
    desk.rotation.y=-.12;
    for(const x of [-3.2,3.2])this.box(group,.15,1.4,3,x,-1.85,0);
    const monitor=this.screen('jouhara / workspace',['const developer = {','  name: "Jouhara NK",','  role: "Full stack developer",','  approach: "build with care"','};','','> let’s build something meaningful']);
    monitor.position.set(0,.6,-.6);monitor.rotation.y=-.12;group.add(monitor);
    this.box(group,.22,1.1,.25,0,-1.1,-.7);this.box(group,1.5,.08,.8,0,-1.5,-.5);
    const keyboard=new THREE.Group();this.box(keyboard,4.8,.12,1.4,0,0,0,0x09162c);
    const keyGeometry=new THREE.BoxGeometry(.27,.055,.24),keyMaterial=this.metal(0x5276a8);
    for(let row=0;row<4;row++)for(let col=0;col<14;col++){const k=new THREE.Mesh(keyGeometry,keyMaterial);k.position.set(col*.32-2.1,.08,row*.29-.43);keyboard.add(k);}
    keyboard.position.set(-.2,-.84,.7);keyboard.rotation.y=-.12;group.add(keyboard);
    this.box(group,.6,.18,.9,2.8,-.82,.8,0x254778);
    for(let i=0;i<4;i++){this.box(group,1.4,.52,2,4,-1.15+i*.6,-1,0x132946);this.box(group,.6,.025,.04,4,-1.15+i*.6,.025,0x5b9fff);}
    const lamp=new THREE.PointLight(0x64a7ff,35,8);lamp.position.set(0,1.8,1);group.add(lamp);
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
      const body=document.createElement('div');body.className='monitor-content';body.appendChild(content);screen.appendChild(body);
      const preview=document.createElement('div');preview.className='monitor-preview';preview.textContent=this.chapters[i];screen.appendChild(preview);
      const object=new CSS3DObject(screen);
      this.spatialPanels.push(object);this.spatialScene.add(object);
      const monitor=new THREE.Group();
      const bezel=this.box(monitor,1,1,1,0,0,-20,0x254b79);
      (bezel.material as THREE.MeshStandardMaterial).emissive.setHex(0x153767);
      (bezel.material as THREE.MeshStandardMaterial).emissiveIntensity=1.8;
      this.box(monitor,80,220,35,0,-100, -65,0x203858);
      this.box(monitor,260,18,150,0,-210,-25,0x162b48);
      this.scene.add(monitor);this.contentMonitors.push(monitor);
    });
    this.spatialPanels[4].element.appendChild(this.certificateDialog.nativeElement);
    this.scene.traverse(object=>{if(object.userData['monitor'])object.visible=false;});
    this.spatialRenderer.render(this.spatialScene,this.camera);
    (this.spatialRenderer.domElement.firstElementChild as HTMLElement).style.display='none';
    this.spatialPanels.forEach(panel=>this.spatialRenderer!.domElement.appendChild(panel.element));
    this.resizeSpatialContent();
  }
  private resizeSpatialContent():void{
    const mobile=window.innerWidth<=900;
    this.spatialRenderer?.setSize(window.innerWidth,window.innerHeight);
    this.spatialPanels.forEach((object,i)=>{
      const panel=object.element;
      const displayPixels=Math.min(window.innerWidth*(mobile?.90:.78),window.innerHeight*.60*(mobile?1.1:1.6));
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
    const mobile=window.innerWidth<=900,station=this.stations[index];
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
    const requestedStage=this.booting()?0:this.scrollChapter+this.scrollPhase;
    // Camera and content follow the current scroll position without queued catch-up.
    if(!this.certificateDialog.nativeElement.open)this.panelStage=requestedStage;
    const index=Math.min(7,Math.floor(this.panelStage)),phase=this.panelStage-index;
    const enter=this.motion()?THREE.MathUtils.smoothstep(phase,0,.20):1;
    const exit=index<7&&this.motion()?THREE.MathUtils.smoothstep(phase,.72,.84):0;
    const bootApproach=this.bootStarted()?(this.motion()?THREE.MathUtils.smoothstep((performance.now()-this.bootStart)/1800,0,1):1):0;
    const approach=this.booting()?bootApproach:enter*(1-exit);
    const screen=this.spatialPanels[index].element,pose=this.monitorPose(index),overview=this.overviewPose(index);
    const worldWidth=mobile?2.8:5.5,scale=worldWidth/screen.offsetWidth;
    const distance=worldWidth*(h*.5*this.camera.projectionMatrix.elements[5])/screen.offsetWidth;
    const readPosition=pose.position.clone().add(new THREE.Vector3(0,-screen.offsetHeight*scale*.12,distance).applyQuaternion(pose.rotation));
    const position=overview.position.clone().lerp(readPosition,approach);
    const rotation=overview.rotation.clone().slerp(pose.rotation,approach);
    if(index<7&&phase>.84){
      const travel=THREE.MathUtils.smoothstep(phase,.84,1),next=this.overviewPose(index+1);
      const midpoint=overview.position.clone().lerp(next.position,.5);midpoint.y+=1.2;
      const arc=new THREE.QuadraticBezierCurve3(overview.position,midpoint,next.position);
      position.copy(arc.getPoint(travel));
      rotation.slerp(next.rotation,travel);
    }
    this.camera.position.copy(position);this.camera.quaternion.copy(rotation);this.camera.updateMatrixWorld();
    this.spatialPanels.forEach((object,i)=>{
      const panel=object.element,monitor=this.contentMonitors[i],screenPose=this.monitorPose(i);
      const panelScale=(mobile?2.8:5.5)/panel.offsetWidth;
      object.position.copy(screenPose.position);object.quaternion.copy(screenPose.rotation);object.scale.setScalar(panelScale);
      monitor.position.copy(screenPose.position);monitor.quaternion.copy(screenPose.rotation);monitor.scale.setScalar(panelScale);monitor.visible=true;
      const neighboring=i===index+1&&phase>.84;
      panel.style.visibility=i===index||neighboring?'visible':'hidden';
      panel.style.opacity=neighboring?String(THREE.MathUtils.smoothstep(phase,.84,.98)):'1';panel.style.pointerEvents=i===index&&approach>.95?'auto':'none';panel.inert=i!==index;
      const body=panel.querySelector<HTMLElement>('.monitor-content')!;
      body.inert=i===4&&this.certificateDialog.nativeElement.open;
      const overflow=Math.max(0,body.offsetHeight-panel.clientHeight+24);
      body.style.transform=`translateY(${-overflow*(i===index?THREE.MathUtils.smoothstep(phase,.24,.70):0)}px)`;
      body.style.opacity='1';panel.querySelector<HTMLElement>('.monitor-preview')!.style.display='none';
    });
    this.spatialPanels.forEach(object=>this.projectDisplay(object));
  }
  private projectDisplay(object:CSS3DObject):void{
    const element=object.element,width=element.offsetWidth,height=element.offsetHeight;
    const corners=[[-width/2,height/2],[width/2,height/2],[width/2,-height/2],[-width/2,-height/2]].map(([x,y])=>{
      const p=new THREE.Vector3(x*object.scale.x,y*object.scale.y,0).applyQuaternion(object.quaternion).add(object.position).project(this.camera);
      return [(p.x+1)*window.innerWidth/2,(1-p.y)*window.innerHeight/2];
    });
    const [p0,p1,p2,p3]=corners;
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
    const active=Math.min(7,Math.floor(this.panelStage)),percent=Math.round(this.panelStage/8*100);

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
    this.camera.zoom=mobile?THREE.MathUtils.clamp(width/height*.9,.4,1):1;
    this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();this.renderer?.setSize(width,height);this.resizeSpatialContent();this.syncScroll();
  };
  ngOnDestroy():void{
    clearTimeout(this.bootTimer);this.bootSound?.pause();
    if(this.booting()||this.shutDown())document.body.style.overflow=this.previousOverflow;
    cancelAnimationFrame(this.frame);window.removeEventListener('scroll',this.syncScroll);window.removeEventListener('keydown',this.key);window.removeEventListener('pointermove',this.move);window.removeEventListener('resize',this.resize);
    this.scene.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>m.dispose());}});
    this.spatialRenderer?.domElement.remove();
    this.textures.forEach(t=>t.dispose());this.renderer?.dispose();
  }
}
