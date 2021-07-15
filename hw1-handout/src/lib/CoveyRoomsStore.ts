import CoveyRoomController from './CoveyRoomController';
import ICoveyRoomsStore from './ICoveyRoomsStore';

export default class CoveyRoomsStore implements ICoveyRoomsStore {
  /** The list of CoveyRoomControllers for this CoveyRoomsStore * */
  private _roomControllers: CoveyRoomController[] = [];

  /** CoveyRoomsStore singleton * */
  private static _instance: CoveyRoomsStore;

  /**
   * Checks to see if there is an instance of a CoveyRoomsStore and returns it
   * If undefined, creates a new instance of a CoveyRoomsStore
   */
  public static getInstance(): CoveyRoomsStore {
    if (CoveyRoomsStore._instance === undefined) {
      CoveyRoomsStore._instance = new CoveyRoomsStore();
    }
    return CoveyRoomsStore._instance;
  }

  /**
   * Creates a new Controller given a coveyRoomID and pushes it to existing list
   * of Controllers.
   *
   * @param coveyRoomID the ID of the new room to create
   */
  private createNewController(coveyRoomID: string): CoveyRoomController {
    const newController = new CoveyRoomController(coveyRoomID);
    this._roomControllers.push(newController);
    return newController;
  }

  /**
   * Retrieves the CoveyRoomController for a given room. If no controller exists,
   * creates one.
   *
   * @param coveyRoomID the ID of the requested room
   */
  getControllerForRoom(coveyRoomID: string): CoveyRoomController {
    const existingController = this._roomControllers.find(
      (controller) => controller.coveyRoomID === coveyRoomID,
    );

    if (existingController !== undefined) {
      return existingController;
    }

    return this.createNewController(coveyRoomID);
  }
}
