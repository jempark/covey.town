import axios, { AxiosInstance } from 'axios';
import {
  RoomCreateRequest,
  RoomCreateResponse,
  RoomDeleteRequest,
  RoomJoinRequest,
  RoomJoinResponse,
  RoomListResponse,
  RoomUpdateRequest,
} from '../requestHandlers/CoveyRoomRequestHandlers';

export default class RoomServiceClient {

  private _axios: AxiosInstance;

  /**
   * Initialize a new API client to connect to the RoomService API that is located at the specified
   * service URL
   *
   * @param serviceURL Base URL of API service to connect to. For example, if the API server is
   * running at http://localhost:8081/, the serviceURL is http://localhost:8081/
   */
  constructor(serviceURL: string) {
    this._axios = axios.create({
      baseURL: serviceURL,
    });
  }

  /**
   * Create a new room in Covey.Town's room service
   *
   * If any error is returned by the API, this method throws a new Error object.
   *
   * @param requestData
   */
  async createRoom(requestData: RoomCreateRequest): Promise<RoomCreateResponse> {
    try {
      const response = await this._axios.post('/rooms', requestData);
      return response.data.response as RoomCreateResponse;
    } catch (e) {
      throw new Error(e);
    }
  }

  /**
   * Update a room in Covey.Town's room service.
   *
   * If any error is returned by the API, this method throws a new Error object.
   *
   * @param requestData
   */
  async updateRoom(requestData: RoomUpdateRequest): Promise<void> {
    try {
      const response = await this._axios.patch(`/rooms/${requestData.coveyRoomID}`, requestData);
      if (!response.data.isOK) {
        throw new Error();
      }
    } catch (e) {
      throw new Error(e);
    }
  }

  /**
   * Deletes a room in Covey.Town's room service
   *
   * If any error is returned by the API, this method throws a new Error object.
   *
   * @param requestData
   */
  async deleteRoom(requestData: RoomDeleteRequest): Promise<void> {
    try {
      const response = await this._axios.delete(`/rooms/${requestData.coveyRoomID}/${requestData.coveyRoomPassword}`);
      if (!response.data.isOK) {
        throw new Error();
      }
    } catch (e) {
      throw new Error(e);
    }
  }

  /**
   * Lists all of the publicly available rooms in Covey.Town's room service
   *
   * If any error is returned by the API, this method throws a new Error object.
   */
  async listRooms(): Promise<RoomListResponse> {
    try {
      const response = await this._axios.get('/rooms');
      return response.data.response as RoomListResponse;
    } catch (e) {
      throw new Error(e);
    }
  }

  /**
   * Establishes a new session, allowing a user to join an existing room
   *
   * If any error is returned by the API, this method throws a new Error object.
   *
   * @param requestData
   */
  async joinRoom(requestData: RoomJoinRequest): Promise<RoomJoinResponse> {
    try {
      const response = await this._axios.post('/sessions', requestData);
      return response.data.response as RoomJoinResponse;
    } catch (e) {
      throw new Error(e);
    } 
  }
}
