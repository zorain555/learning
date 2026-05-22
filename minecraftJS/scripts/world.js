import * as THREE from 'three';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import { RNG} from './rng.js';
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshLambertMaterial({ color: 0x00d000 });

export class World extends THREE.Group {
    /**
     * @type {{
     * id: number,
     * instanceId: number
     * }[][][]}
     */ 
    data = [];

    params = {
         Seed: 0,
        terrain: {
            scale: 30,
            magnitude: 0.5,
            offset: 0.2
        }
    }

    constructor(size = { width: 32, height: 16 }) {
        super();
        this.size = size;
    }

    generate() {
        this.initializeTerrain(); // Step 1: Initialize empty data first
        this.generateTerrain();   // Step 2: Fill data with noise
        this.generateMeshes();    // Step 3: Create meshes
    }

    initializeTerrain() {
        this.data = [];
        for (let x = 0; x < this.size.width; x++) {
            const slice = []; 
            for (let y = 0; y < this.size.height; y++) {
                const row = [];
                for (let z = 0; z < this.size.width; z++) {
                    row.push({
                        id: 0,
                        instanceId: null
                    });
                }
                slice.push(row);
            } 
            this.data.push(slice);
        }
    }

    generateTerrain() {
        const rng = new RNG();
        const simplex = new SimplexNoise(rng);

        for (let x = 0; x < this.size.width; x++) {
            for (let z = 0; z < this.size.width; z++) {
                
                // Three.js SimplexNoise uses .noise() not .noise2D()
                const value = simplex.noise(
                    x / this.params.terrain.scale, 
                    z / this.params.terrain.scale
                );

                // Normalize from (-1, 1) to (0, 1)
                const normalizedNoise = (value + 1) / 2;
                const scaledNoise = this.params.terrain.offset + 
                                   (this.params.terrain.magnitude * normalizedNoise);

                let height = Math.floor(scaledNoise * this.size.height);
                height = Math.max(0, Math.min(height, this.size.height));

                for (let y = 0; y < height; y++) {
                    this.setBlockId(x, y, z, 1);
                }
            }
        }
    }

    generateMeshes() {
        this.clear();

        let instanceCount = 0;
        for (let x = 0; x < this.size.width; x++) {
            for (let y = 0; y < this.size.height; y++) {
                for (let z = 0; z < this.size.width; z++) {
                    if (this.getBlock(x, y, z)?.id === 1) instanceCount++;
                }
            }
        }

        const mesh = new THREE.InstancedMesh(geometry, material, instanceCount);
        let count = 0;
        const matrix = new THREE.Matrix4();

        for (let x = 0; x < this.size.width; x++) {
            for (let y = 0; y < this.size.height; y++) {
                for (let z = 0; z < this.size.width; z++) {
                    const block = this.getBlock(x, y, z);
                    
                    if (block && block.id === 1) { 
                        matrix.setPosition(x + 0.5, y + 0.5, z + 0.5);
                        mesh.setMatrixAt(count, matrix);
                        this.setBlockInstanceId(x, y, z, count);
                        count++;
                    }
                }
            } 
        } 

        mesh.count = count;
        mesh.instanceMatrix.needsUpdate = true;
        this.add(mesh);
    }
    
  /**
   * Gets the block data at (x, y, z)
   * @param {number} x 
   * @param {number} y 
   * @param {number} z 
   * @returns {{id: number, instanceId: number}}
   */
  getBlock(x, y, z) {
    if (this.inBounds(x, y, z)) {
      return this.data[x][y][z];
    } else {
      return null;
    }
  }
  

  /**
   * Sets the block id for the block at (x, y, z)
   * @param {number} x 
   * @param {number} y 
   * @param {number} z 
   * @param {number} id
   */
  setBlockId(x, y, z, id) {
    if (this.inBounds(x, y, z)) {
      this.data[x][y][z].id = id;
    }
  }
  

  /**
   * Sets the block instance id for the block at (x, y, z)
   * @param {number} x 
   * @param {number} y 
   * @param {number} z 
   * @param {number} instanceId
   */
  setBlockInstanceId(x, y, z, instanceId) {
    if (this.inBounds(x, y, z)) {
      this.data[x][y][z].instanceId = instanceId;
    }
  }
  
  /**
   * Checks if the (x, y, z) coordinates are within bounds
   * @param {number} x 
   * @param {number} y 
   * @param {number} z 
   * @returns {boolean}
   */
  inBounds(x, y, z) {
    if (x >= 0 && x < this.size.width &&
      y >= 0 && y < this.size.height &&
      z >= 0 && z < this.size.width) {
      return true; 
    } else {
      return false;
    }
  }
}