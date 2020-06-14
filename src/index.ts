// add styles
import './style.css'

import * as THREE from 'three'
import { WEBGL } from 'three/examples/jsm/WebGL'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import { Material, Texture, AnimationMixer, AnimationAction } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

type Player = {
  animation: {
    name: string
    action: AnimationAction | null
    time: number
    mixer: AnimationMixer | null
  }
  gltf: GLTF | null
}

class Game {
  player: Player
  animations: any
  clock: THREE.Clock
  container: HTMLDivElement
  camera: THREE.PerspectiveCamera
  scene: THREE.Scene
  renderer: THREE.WebGLRenderer
  controls: OrbitControls

  constructor() {
    if (!WEBGL.isWebGLAvailable()) {
      document.body.appendChild(WEBGL.getWebGLErrorMessage())
    }

    this.player = {
      animation: { name: '', action: null, time: 0, mixer: null },
      gltf: null
    }
    this.animations = {}
    this.clock = new THREE.Clock()
    this.container = document.createElement('div')
    this.container.style.height = '100%'
    document.body.appendChild(this.container)

    document.querySelector('button').onclick = () => {
      this.toggleAnimation()
    }

    this.init()
  }

  init = () => {
    /* camera */
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      2000
    )
    this.camera.position.set(112, 100, 400)

    /* scene */
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xa0a0a0)
    this.scene.fog = new THREE.Fog(0xa0a0a0, 700, 1800)

    /* light */
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444)
    hemisphereLight.position.set(0, 200, 0)
    this.scene.add(hemisphereLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff)
    directionalLight.position.set(0, 200, 100)
    directionalLight.castShadow = true
    directionalLight.shadow.camera.top = 180
    directionalLight.shadow.camera.bottom = -100
    directionalLight.shadow.camera.left = -120
    directionalLight.shadow.camera.right = 120
    this.scene.add(directionalLight)

    /* ground */
    const ground = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(4000, 4000),
      new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    /* grid */
    const grid = new THREE.GridHelper(4000, 60, 0x000000, 0x000000)
    if (grid.material instanceof Material) {
      grid.material.opacity = 0.2
      grid.material.transparent = true
    }
    this.scene.add(grid)

    /* model */
    this.loadGLTF()

    /* renderer */
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.outputEncoding = THREE.sRGBEncoding
    this.container.appendChild(this.renderer.domElement)

    /* orbit controls */
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)

    /* animate */
    // this.animate()

    /* resize */
    window.addEventListener('resize', () => {
      this.onWindowResize()
    })
  }

  toggleAnimation = () => {
    if (this.player?.animation?.name === 'Idle') {
      this.playAnimation('Pointing Gesture')
    } else {
      this.playAnimation('Idle')
    }
  }

  loadGLTF = () => {
    const gltfLoader = new GLTFLoader()
    gltfLoader.load('./assets/models/FireFighter/FireFighter.gltf', gltf => {
      const model = gltf.scene
      model.scale.set(50, 50, 50)

      const mixer = new THREE.AnimationMixer(model)
      this.player.animation.mixer = mixer
      model.name = 'FireFighter'

      model.traverse(child => {
        if ((<any>child).isMesh) {
          child.castShadow = true
          child.receiveShadow = false
        }
      })

      const textureLoader = new THREE.TextureLoader()
      textureLoader.load(
        './assets/images/SimplePeople_FireFighter_Brown.png',
        (texture: Texture) => {
          texture.encoding = THREE.sRGBEncoding
          texture.flipY = false

          model.traverse(child => {
            if ((<any>child).isMesh) {
              ;(<any>child).material.map = texture
            }
          })

          this.scene.add(model)
        }
      )

      this.player.gltf = gltf
      this.animations['Idle'] = gltf.animations[0]

      const animations = ['Pointing Gesture']
      animations.forEach(async animationName => {
        await this.loadAnimation(gltfLoader, animationName)
      })

      this.playAnimation('Idle')
      this.animate()
    })
  }

  playAnimation = (animationName: string) => {
    const nextAction = this.player.animation.mixer.clipAction(
      this.animations[animationName]
    )
    nextAction.enabled = true
    nextAction.paused = false
    nextAction.setEffectiveTimeScale(1)
    nextAction.setEffectiveWeight(1)
    nextAction.time = 0

    const currentAction = this?.player?.animation?.action

    if (currentAction) {
      currentAction.crossFadeTo(nextAction, 0.5, true)
      nextAction.play()

      //   const player = this.player
      //   player.animation.mixer.addEventListener('loop', onLoopFinished)

      //   function onLoopFinished(event) {
      //     console.log('on loop finished', event.action)
      //     if (event.action === currentAction) {
      //       player.animation.mixer.removeEventListener('loop', onLoopFinished)
      //       currentAction.crossFadeTo(nextAction, 1, true)
      //       nextAction.play()
      //       player.animation.action = nextAction
      //       player.animation.name = animationName
      //     }
      //   }
    } else {
      nextAction.play()
    }

    const { animation } = this.player
    animation.name = animationName
    animation.time = Date.now()
    animation.action = nextAction
  }

  currentAnimationName = (): string => {
    return this.player?.animation?.name || ''
  }

  loadAnimation = (gltfLoader: GLTFLoader, animationName: string) => {
    return new Promise((resolve, reject) => {
      gltfLoader.load(
        `./assets/animations/${animationName}/${animationName}.gltf`,
        gltf => {
          this.animations[animationName] = gltf.animations[0]
          resolve()
        },
        null,
        reject
      )
    })
  }

  animate = () => {
    const dt = this.clock.getDelta()

    requestAnimationFrame(() => {
      this.animate()
    })

    if (this.player.animation.mixer) {
      this.player.animation.mixer.update(dt)
    }

    this.renderer.render(this.scene, this.camera)
  }

  onWindowResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }
}

const game = new Game()

declare global {
  interface Window {
    game: Game
  }
}

window.game = game // for debugging purpose
