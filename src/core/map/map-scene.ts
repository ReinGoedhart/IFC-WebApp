import * as OBC from "openbim-components";
import { MAPBOX_KEY } from "../../config";
import { Building, GisParameters, LngLat } from "./types";
import * as MAPBOX from "mapbox-gl";
import * as THREE from "three";
import { User } from "firebase/auth";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";

export class MapScene {
  private components = new OBC.Components();
  private readonly style = "mapbox://styles/mapbox/light-v10";
  private map: MAPBOX.Map;
  private center: LngLat = { lat: 0, lng: 0 };
  private clickedCoordinates: LngLat = { lat: 0, lng: 0 };
  private labels: { [id: string]: CSS2DObject } = {};

  constructor(container: HTMLDivElement) {
    const configuration = this.getConfig(container);
    this.map = this.createMap(configuration);
    this.initializeComponents(configuration);
    this.setupScene();
  }

  dispose() {
    this.components.dispose();
    (this.map as any) = null;
    (this.components as any) = null;
    for (const id in this.labels) {
      const label = this.labels[id];
      label.removeFromParent();
      label.element.remove();
    }
    this.labels = {};
  }

  addBuilding(user: User) {
    const { lat, lng } = this.clickedCoordinates;
    const userId = user.uid;
    const building = { userId, lat, lng, uid: "" };
    this.addToScene([building]);
  }

  private addToScene(buildings: Building[]) {
    for (const building of buildings) {
      const { uid, lng, lat } = building;

      const htmlElement = this.createHtmlElement();

      const label = new CSS2DObject(htmlElement);

      const center = MAPBOX.MercatorCoordinate.fromLngLat(
        { ...this.center },
        0
      );

      const units = center.meterInMercatorCoordinateUnits();

      const model = MAPBOX.MercatorCoordinate.fromLngLat({ lng, lat }, 0);
      model.x /= units;
      model.y /= units;
      center.x /= units;
      center.y /= units;

      label.position.set(model.x - center.x, 0, model.y - center.y);

      this.components.scene.get().add(label);
      this.labels[uid] = label;
    }
  }

  private createHtmlElement() {
    const div = document.createElement("div");
    div.textContent = "🏢";
    div.classList.add("thumbnail");
    return div;
  }

  private setupScene() {
    const scene = this.components.scene.get();
    scene.background = null;
    const dirlight1 = new THREE.DirectionalLight(0xffffff);
    dirlight1.position.set(0, -70, 100).normalize();
    scene.add(dirlight1);
    const dirlight2 = new THREE.DirectionalLight(0xffffff);
    dirlight2.position.set(0, 70, 100).normalize();
    scene.add(dirlight2);
  }

  private initializeComponents(config: GisParameters) {
    this.components.scene = new OBC.SimpleScene(this.components);
    this.components.camera = new OBC.MapboxCamera();
    this.components.renderer = this.createRenderer(config);
    this.components.init();
  }

  private createRenderer(config: GisParameters) {
    const coords = this.getCoordinates(config);
    return new OBC.MapboxRenderer(this.components, this.map, coords);
  }

  private getCoordinates(config: GisParameters) {
    const merc = MAPBOX.MercatorCoordinate;
    return merc.fromLngLat(config.center, 0);
  }

  private createMap(config: GisParameters) {
    const map = new MAPBOX.Map({
      ...config,
      style: this.style,
      antialias: true,
    });
    map.on("contextmenu", this.storeMousePosition);
    return map;
  }

  private storeMousePosition = (event: MAPBOX.MapMouseEvent) => {
    this.clickedCoordinates = { ...event.lngLat };
  };
  private getConfig(container: HTMLDivElement) {
    const center = [5.193455681100045, 52.064220142918835] as [number, number];
    this.center = { lng: center[0], lat: center[1] };
    return {
      container,
      accessToken: MAPBOX_KEY,
      zoom: 15,
      pitch: 60,
      bearing: -40,
      center,
      buildings: 40,
    };
  }
}
