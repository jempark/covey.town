import axios, { AxiosInstance, AxiosResponse } from 'axios';
import assert from 'assert';
import { UserLocation } from '../CoveyTypes';


export type ServerPlayer = { _id: string, _userName: string, location: UserLocation };

/**
 * The format of a request to join a Town in Covey.Town, as dispatched by the server middleware
 */
export interface TownJoinRequest {
  /** userName of the player that would like to join * */
  userName: string;
  /** ID of the town that the player would like to join * */
  coveyTownID: string;
  /** whether user is logged in or not */
  isLoggedIn: boolean;
  /** ID of the user if they are logged in */
  userID?: string;
}

/**
 * The format of a response to join a Town in Covey.Town, as returned by the handler to the server
 * middleware
 */
export interface TownJoinResponse {
  /** Unique ID that represents this player * */
  coveyUserID: string;
  /** Secret token that this player should use to authenticate
   * in future requests to this service * */
  coveySessionToken: string;
  /** Secret token that this player should use to authenticate
   * in future requests to the video service * */
  providerVideoToken: string;
  /** List of players currently in this town * */
  currentPlayers: ServerPlayer[];
  /** Friendly name of this town * */
  friendlyName: string;
  /** Is this a private town? * */
  isPubliclyListed: boolean;
}

/**
 * Payload sent by client to create a Town in Covey.Town
 */
export interface TownCreateRequest {
  friendlyName: string;
  isPubliclyListed: boolean;
}

/**
 * Response from the server for a Town create request
 */
export interface TownCreateResponse {
  coveyTownID: string;
  coveyTownPassword: string;
}

/**
 * Response from the server for a Town list request
 */
export interface TownListResponse {
  towns: CoveyTownInfo[];
}

/**
 * Payload sent by the client to delete a Town
 */
export interface TownDeleteRequest {
  coveyTownID: string;
  coveyTownPassword: string;
}

/**
 * Payload sent by the client to update a Town.
 * N.B., JavaScript is terrible, so:
 * if(!isPubliclyListed) -> evaluates to true if the value is false OR undefined, use ===
 */
export interface TownUpdateRequest {
  coveyTownID: string;
  coveyTownPassword: string;
  friendlyName?: string;
  isPubliclyListed?: boolean;
}

export type JoinedTown = {
  townID: string,
  positionX: number,
  positionY: number,
};

/**
 * Payload sent by client to save a user in Covey.Town
 */
export interface SaveUserRequest {
  userID: string;
  email?: string;
  username?: string;
  useAudio?: boolean;
  useVideo?: boolean;
  towns?: JoinedTown[];
}

/**
 * Payload sent by client to request information for a user's email
 */
export interface GetUserRequest {
  userID: string;
}

/**
 * Response from the server for a get user request
 */
export interface GetUserResponse {
  userID: string;
  email: string;
  username: string;
  useAudio: boolean;
  useVideo: boolean;
  towns: JoinedTown[];
}

/**
 * Payload sent by client to reset a user's saved preferences specified by a certain ID
 */
export interface ResetUserRequest {
  userID: string;
}

/**
 * Payload sent by client to a user specified by a certain ID
 */
export interface DeleteUserRequest {
  userID: string;
}

/**
 * Envelope that wraps any response from the server
 */
export interface ResponseEnvelope<T> {
  isOK: boolean;
  message?: string;
  response?: T;
}

export type CoveyTownInfo = {
  friendlyName: string;
  coveyTownID: string;
  currentOccupancy: number;
  maximumOccupancy: number;
};

export default class CoveyServicesClient {
  private _axios: AxiosInstance;

  /**
   * Construct a new Towns Service API client. Specify a serviceURL for testing, or otherwise
   * defaults to the URL at the environmental variable REACT_APP_ROOMS_SERVICE_URL
   * @param serviceURL
   */
  constructor(serviceURL?: string) {
    const baseURL = serviceURL || process.env.REACT_APP_TOWNS_SERVICE_URL;
    assert(baseURL);
    this._axios = axios.create({ baseURL });
  }

  static unwrapOrThrowError<T>(response: AxiosResponse<ResponseEnvelope<T>>, ignoreResponse = false): T {
    if (response.data.isOK) {
      if (ignoreResponse) {
        return {} as T;
      }
      assert(response.data.response);
      return response.data.response;
    }
    throw new Error(`Error processing request: ${response.data.message}`);
  }

  async createTown(requestData: TownCreateRequest): Promise<TownCreateResponse> {
    const responseWrapper = await this._axios.post<ResponseEnvelope<TownCreateResponse>>('/towns', requestData);
    return CoveyServicesClient.unwrapOrThrowError(responseWrapper);
  }

  async updateTown(requestData: TownUpdateRequest): Promise<void> {
    const responseWrapper = await this._axios.patch<ResponseEnvelope<void>>(`/towns/${requestData.coveyTownID}`, requestData);
    return CoveyServicesClient.unwrapOrThrowError(responseWrapper, true);
  }

  async deleteTown(requestData: TownDeleteRequest): Promise<void> {
    const responseWrapper = await this._axios.delete<ResponseEnvelope<void>>(`/towns/${requestData.coveyTownID}/${requestData.coveyTownPassword}`);
    return CoveyServicesClient.unwrapOrThrowError(responseWrapper, true);
  }

  async listTowns(): Promise<TownListResponse> {
    const responseWrapper = await this._axios.get<ResponseEnvelope<TownListResponse>>('/towns');
    return CoveyServicesClient.unwrapOrThrowError(responseWrapper);
  }

  async joinTown(requestData: TownJoinRequest): Promise<TownJoinResponse> {
    const responseWrapper = await this._axios.post('/sessions', requestData);
    return CoveyServicesClient.unwrapOrThrowError(responseWrapper);
  }

  async saveUser(requestData: SaveUserRequest): Promise<void> {
    const responseWrapper = await this._axios.put<ResponseEnvelope<void>>('/user', requestData);
    return CoveyServicesClient.unwrapOrThrowError(responseWrapper, true);
  }

  async getUser(requestData: GetUserRequest): Promise<GetUserResponse> {
    const responseWrapper = await this._axios.get<ResponseEnvelope<GetUserResponse>>(`/users/${requestData.userID}`);
    return CoveyServicesClient.unwrapOrThrowError(responseWrapper);
  }

  async resetUser(requestData: ResetUserRequest): Promise<void> {
    const responseWrapper = await this._axios.patch<ResponseEnvelope<void>>(`/users/${requestData.userID}`);
    return CoveyServicesClient.unwrapOrThrowError(responseWrapper, true);
  }

  async deleteUser(requestData: DeleteUserRequest): Promise<void> {
    const responseWrapper = await this._axios.delete<ResponseEnvelope<void>>(`/users/${requestData.userID}`);
    return CoveyServicesClient.unwrapOrThrowError(responseWrapper, true);  
  }
}

