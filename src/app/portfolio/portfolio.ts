import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, signal } from '@angular/core';
import * as THREE from 'three';

@Component({selector:'app-portfolio',standalone:true,templateUrl:'./portfolio.html',styleUrl:'./portfolio.scss'})
export class PortfolioComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas',{static:true}) canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('workVideoDialog',{static:true}) workVideoDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('certificateDialog',{static:true}) certificateDialog!: ElementRef<HTMLDialogElement>;
  readonly selectedCertificate=signal<string[]|null>(null);
  readonly chapters=['Introduction','About me','Skills','Experience','Education & certifications','Selected work','Let’s connect'];
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
  private target=0;
  private current=0;
  private frame=0;
  private lastTime=0;
  private resetPanel=false;
  private pointer=new THREE.Vector2();
  private touchY=0;
  private stations:THREE.Group[]=[];
  private layers:THREE.Group[]=[];
  private textures:THREE.Texture[]=[];
  private orbit?:THREE.Group;
  private milestones:THREE.Group[]=[];
  private positions=[new THREE.Vector3(0,1.3,18),new THREE.Vector3(-2,2.2,15),new THREE.Vector3(0,1,0),new THREE.Vector3(0,1,-24),new THREE.Vector3(0,1,-48),new THREE.Vector3(0,1,-72),new THREE.Vector3(-3,3,-89)];
  constructor(private zone:NgZone){}
  ngAfterViewInit():void{
    try{this.init();}catch{this.fallback.set(true);}
    window.addEventListener('wheel',this.wheel,{passive:false});
    window.addEventListener('keydown',this.key);
    window.addEventListener('pointermove',this.move);
    window.addEventListener('touchstart',this.touchStart,{passive:true});
    window.addEventListener('touchmove',this.touchMove,{passive:false});
    window.addEventListener('resize',this.resize);
  }
  go(index:number):void{this.target=THREE.MathUtils.clamp(index,0,6)/6;this.menuOpen.set(false);if(this.fallback())this.chapter.set(Math.round(this.target*6));}
  openCertificate(cert:string[]):void{
    this.selectedCertificate.set(cert);
    this.certificateDialog.nativeElement.showModal();
  }
  dismissCertificateBackdrop(event:MouseEvent):void{
    const dialog=this.certificateDialog.nativeElement,rect=dialog.getBoundingClientRect();
    if(event.target===dialog&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom))dialog.close();
  }
  openWorkVideo():void{this.workVideoDialog.nativeElement.showModal();}
  dismissVideoBackdrop(event:MouseEvent):void{
    const dialog=this.workVideoDialog.nativeElement;
    const rect=dialog.getBoundingClientRect();
    if(event.target===dialog&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom))dialog.close();
  }
  toggleMotion():void{this.motion.update(value=>!value);}
  private canScroll(target:EventTarget|null,delta:number):boolean{
    const panel=(target as HTMLElement)?.closest<HTMLElement>('.content,.chapter-menu');
    return !!panel&&((delta>0&&panel.scrollTop+panel.clientHeight<panel.scrollHeight-2)||(delta<0&&panel.scrollTop>0));
  }
  private wheel=(e:WheelEvent):void=>{
    if(this.certificateDialog.nativeElement.open||this.workVideoDialog.nativeElement.open||this.menuOpen()||this.canScroll(e.target,e.deltaY))return;
    e.preventDefault();this.target=THREE.MathUtils.clamp(this.target+e.deltaY*(e.deltaMode===1?.003:.00018),0,1);
    if(this.fallback())this.chapter.set(Math.round(this.target*6));
  };
  private key=(e:KeyboardEvent):void=>{
    if(this.certificateDialog.nativeElement.open||this.workVideoDialog.nativeElement.open)return;
    if(e.key==='Escape'){this.menuOpen.set(false);return;}
    if((e.target as HTMLElement)?.closest('button,a,input,.content'))return;
    const d=['ArrowDown','ArrowRight','PageDown',' '].includes(e.key)?1:['ArrowUp','ArrowLeft','PageUp'].includes(e.key)?-1:0;
    if(d){e.preventDefault();this.go(this.chapter()+d);}
    if(e.key==='Home')this.go(0);if(e.key==='End')this.go(6);
  };
  private move=(e:PointerEvent):void=>{this.pointer.set(e.clientX/window.innerWidth-.5,e.clientY/window.innerHeight-.5);};
  private touchStart=(e:TouchEvent):void=>{this.touchY=e.touches[0].clientY;};
  private touchMove=(e:TouchEvent):void=>{
    const y=e.touches[0].clientY,delta=this.touchY-y;this.touchY=y;
    if(this.certificateDialog.nativeElement.open||this.workVideoDialog.nativeElement.open||this.menuOpen()||this.canScroll(e.target,delta))return;
    e.preventDefault();this.target=THREE.MathUtils.clamp(this.target+delta*.00075,0,1);
  };
  private init():void{
    this.scene.background=new THREE.Color('#030712');this.scene.fog=new THREE.FogExp2('#030712',.022);
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas.nativeElement,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
    this.scene.add(new THREE.HemisphereLight(0x9ec8ff,0x0b1324,2.4));
    const key=new THREE.DirectionalLight(0xdceaff,3);key.position.set(-3,8,10);this.scene.add(key);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(65,190),new THREE.MeshStandardMaterial({color:0x07101f,roughness:.35,metalness:.5}));
    floor.rotation.x=-Math.PI/2;floor.position.set(5,-3.4,-45);this.scene.add(floor);
    const wall=new THREE.Mesh(new THREE.PlaneGeometry(180,28),new THREE.MeshStandardMaterial({color:0x050d1c,roughness:.6}));
    wall.rotation.y=-Math.PI/2;wall.position.set(17,8,-45);this.scene.add(wall);
    for(let i=0;i<6;i++){
      const z=i===0?0:-18-(i-1)*24;
      const station=new THREE.Group();station.position.set(5.6,0,z);this.scene.add(station);this.stations.push(station);
      const platform=new THREE.Mesh(new THREE.CylinderGeometry(5.2,5.4,.3,64),this.metal(0x101e38));platform.position.y=-3.2;station.add(platform);
      const rim=new THREE.Mesh(new THREE.TorusGeometry(5.2,.035,6,100),new THREE.MeshBasicMaterial({color:0x3d88ff}));rim.rotation.x=Math.PI/2;rim.position.y=-3.02;station.add(rim);
      const light=new THREE.PointLight(0x367aff,100,24);light.position.set(5,3,z+4);this.scene.add(light);
    }
    this.buildDesk(this.stations[0]);this.buildLayers(this.stations[1]);this.buildMilestones(this.stations[2]);this.buildLearning(this.stations[3]);this.buildProject(this.stations[4]);this.buildContact(this.stations[5]);
    this.resize();this.zone.runOutsideAngular(()=>this.animate(0));
  }
  private metal(color=0x162949):THREE.MeshStandardMaterial{return new THREE.MeshStandardMaterial({color,metalness:.65,roughness:.28});}
  private box(group:THREE.Group,w:number,h:number,d:number,x:number,y:number,z:number,color=0x162949):THREE.Mesh{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.metal(color));mesh.position.set(x,y,z);group.add(mesh);return mesh;
  }
  private screen(title:string,lines:string[],width=5.5,height=3.4):THREE.Group{
    const group=new THREE.Group();this.box(group,width,height,.18,0,0,0,0x1c3051);
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
    const desk=this.box(group,8,.25,4.4,0,-1.65,0,0x14243d);
    desk.rotation.y=-.12;
    for(const x of [-3.2,3.2])this.box(group,.15,1.4,3,x,-2.45,0);
    const monitor=this.screen('jouhara / workspace',['const developer = {','  name: "Jouhara NK",','  role: "Full stack developer",','  approach: "build with care"','};','','> let’s build something meaningful']);
    monitor.position.set(0,.6,-.6);monitor.rotation.y=-.12;group.add(monitor);
    this.box(group,.22,1.1,.25,0,-1.1,-.7);this.box(group,1.5,.08,.8,0,-1.5,-.5);
    const keyboard=new THREE.Group();this.box(keyboard,4.8,.12,1.4,0,0,0,0x09162c);
    const keyGeometry=new THREE.BoxGeometry(.27,.055,.24),keyMaterial=this.metal(0x5276a8);
    for(let row=0;row<4;row++)for(let col=0;col<14;col++){const k=new THREE.Mesh(keyGeometry,keyMaterial);k.position.set(col*.32-2.1,.08,row*.29-.43);keyboard.add(k);}
    keyboard.position.set(-.2,-1.44,1);keyboard.rotation.y=-.12;group.add(keyboard);
    this.box(group,.6,.18,.9,2.8,-1.42,1.1,0x254778);
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
  private animate=(time:number):void=>{
    this.frame=requestAnimationFrame(this.animate);
    const dt=Math.min((time-this.lastTime)/1000,.05);this.lastTime=time;
    this.current=THREE.MathUtils.lerp(this.current,this.target,this.motion()?1-Math.exp(-dt*4):1);
    const stage=this.current*6,index=Math.min(5,Math.floor(stage)),t=THREE.MathUtils.smoothstep(stage-index,0,1);
    const pos=this.positions[index].clone().lerp(this.positions[index+1],t);
    if(this.motion()){pos.x+=this.pointer.x*.28;pos.y-=this.pointer.y*.15;}
    this.camera.position.copy(pos);this.camera.lookAt(1.5,.1,pos.z-19);
    if(this.resetPanel){
      const panel=this.canvas.nativeElement.parentElement?.querySelector<HTMLElement>('.content');
      if(panel)panel.scrollTop=0;
      this.resetPanel=false;
    }
    const active=Math.round(stage),percent=Math.round(this.current*100);
    if(active!==this.chapter())this.resetPanel=true;
    if(active!==this.chapter()||percent!==this.progress())this.zone.run(()=>{this.chapter.set(active);this.progress.set(percent);});
    // The stack separates as the camera approaches it, then settles into three readable layers.
    const assembly=THREE.MathUtils.smoothstep(stage,1.15,2);
    this.layers.forEach((layer,i)=>{layer.position.y=(1-i)*THREE.MathUtils.lerp(.3,2.2,assembly);layer.position.x=(i-1)*THREE.MathUtils.lerp(.08,.6,assembly);layer.rotation.z=(i-1)*.045*assembly;});
    this.milestones.forEach((m,i)=>{m.position.y=THREE.MathUtils.lerp(-2.5,-.2+i*.8,THREE.MathUtils.smoothstep(stage,2.3+i*.15,2.8+i*.15));});
    if(this.motion()&&this.orbit)this.orbit.rotation.y=time*.00017;
    this.renderer?.render(this.scene,this.camera);
  };
  private resize=():void=>{this.camera.aspect=window.innerWidth/window.innerHeight;this.camera.fov=window.innerWidth<700?62:46;this.camera.updateProjectionMatrix();this.renderer?.setSize(window.innerWidth,window.innerHeight);};
  ngOnDestroy():void{
    cancelAnimationFrame(this.frame);window.removeEventListener('wheel',this.wheel);window.removeEventListener('keydown',this.key);window.removeEventListener('pointermove',this.move);window.removeEventListener('touchstart',this.touchStart);window.removeEventListener('touchmove',this.touchMove);window.removeEventListener('resize',this.resize);
    this.scene.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>m.dispose());}});
    this.textures.forEach(t=>t.dispose());this.renderer?.dispose();
  }
}
