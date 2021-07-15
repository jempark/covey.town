import Express from 'express';
import CORS from 'cors';
import http from 'http';
import { AddressInfo } from 'net';

import addRoomRoutes from '../router/room';
import RoomServiceClient from './RoomServiceClient';
import { ConfigureTest, StartTest } from '../FaultManager';

describe('RoomServiceApiREST', () => {
  /* A testing server that will be deployed before testing and reused throughout all of the tests */
  let server: http.Server;
  /* A testing client that will be automatically configured with a serviceURL to point to the testing server */
  let apiClient: RoomServiceClient;

  beforeAll(async () => {
    // Deploy a testing server
    const app = Express();
    app.use(CORS());
    server = http.createServer(app);
    addRoomRoutes(server, app);
    server.listen();
    const address = server.address() as AddressInfo;

    // Create the testing client
    apiClient = new RoomServiceClient(`http://127.0.0.1:${address.port}`);
  });
  afterAll(async () => {
    // After all tests are done, shut down the server to avoid any resource leaks
    server.close();
  });

  describe('CoveyRoomCreateAPI', () => {
    it.each(ConfigureTest('CR'))('Allows for multiple rooms with the same friendlyName [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);
      const friendlyRoomName = 'friendlyName1';
      await apiClient.createRoom({ friendlyName: friendlyRoomName, isPubliclyListed: true });
      await apiClient.createRoom({ friendlyName: friendlyRoomName, isPubliclyListed: true });
      
      const roomList = await apiClient.listRooms();
      const roomListLength = roomList.rooms.length;
      expect(roomList.rooms[roomListLength - 1].friendlyName).toBe(friendlyRoomName);
      expect(roomList.rooms[roomListLength - 2].friendlyName).toBe(friendlyRoomName);
    });
    it.each(ConfigureTest('CR2'))('Prohibits a blank friendlyName [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);
      await expect(apiClient.createRoom({ friendlyName: '', isPubliclyListed: true })).rejects.toThrowError();
      await expect(apiClient.createRoom({ friendlyName: '', isPubliclyListed: false })).rejects.toThrowError();
    });
  });

  describe('CoveyRoomListAPI', () => {
    it.each(ConfigureTest('LPub'))('Lists public rooms, but not private rooms [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);
      const roomList = await apiClient.listRooms();
      const roomListLength = roomList.rooms.length;

      const publicRoomName = 'publicRoom1';
      const privateRoomName = 'privateRoom1';
      await apiClient.createRoom({ friendlyName: publicRoomName, isPubliclyListed: true });
      await apiClient.createRoom({ friendlyName: privateRoomName, isPubliclyListed: false });
      
      const updatedRoomList = await apiClient.listRooms();
      const updatedRoomListLength = updatedRoomList.rooms.length;
      expect(updatedRoomListLength).toBe(roomListLength + 1);
      expect(updatedRoomList.rooms[updatedRoomListLength - 1].friendlyName).toBe(publicRoomName);
      
      const foundPrivateRoomNameList = updatedRoomList.rooms.filter(room => room.friendlyName === privateRoomName);
      expect(foundPrivateRoomNameList.length).toBe(0);
    });
    it.each(ConfigureTest('LMF'))('Allows for multiple rooms with the same friendlyName [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);
      const roomList = await apiClient.listRooms();
      const roomListLength = roomList.rooms.length;
      
      // for some reason lint throws an object-shorthand error here so I couldn't use variables for this
      const friendlyRoomName = 'friendlyName1';
      await apiClient.createRoom({ friendlyName: friendlyRoomName, isPubliclyListed: true });
      await apiClient.createRoom({ friendlyName: 'friendlyName2', isPubliclyListed: true });
      await apiClient.createRoom({ friendlyName: friendlyRoomName, isPubliclyListed: true });
      await apiClient.createRoom({ friendlyName: friendlyRoomName, isPubliclyListed: true });
      await apiClient.createRoom({ friendlyName: friendlyRoomName, isPubliclyListed: false });
      await apiClient.createRoom({ friendlyName: 'friendlyName3', isPubliclyListed: false });
      await apiClient.createRoom({ friendlyName: friendlyRoomName, isPubliclyListed: false });
      await apiClient.createRoom({ friendlyName: friendlyRoomName, isPubliclyListed: false });

      const updatedRoomList = await apiClient.listRooms();
      const updatedRoomListLength = updatedRoomList.rooms.length;
      expect(updatedRoomListLength).toBe(roomListLength + 4);
      expect(updatedRoomList.rooms[updatedRoomListLength - 1].friendlyName).toBe(friendlyRoomName);
      expect(updatedRoomList.rooms[updatedRoomListLength - 2].friendlyName).toBe(friendlyRoomName);
    });
  });

  describe('CoveyRoomDeleteAPI', () => {
    it.each(ConfigureTest('DRP'))('Throws an error if the password is invalid [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);
      const publicRoomName = 'publicRoom1';
      const publicRoom = await apiClient.createRoom({ friendlyName: publicRoomName, isPubliclyListed: true });
      await expect(apiClient.deleteRoom({ coveyRoomID: publicRoom.coveyRoomID, coveyRoomPassword: `Not ${publicRoom.coveyRoomPassword}` })).rejects.toThrowError();
    });
    it.each(ConfigureTest('DRID'))('Throws an error if the roomID is invalid [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);
      await expect(apiClient.deleteRoom({ coveyRoomID: 'Reyek is boosted', coveyRoomPassword: 'cloud is the best' })).rejects.toThrowError();
    });
    it.each(ConfigureTest('DRV'))('Deletes a room if given a valid password and room, no longer allowing it to be joined or listed [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);
      const publicRoom = await apiClient.createRoom({ friendlyName: 'publicRoom1', isPubliclyListed: true });
      await apiClient.joinRoom({ userName: 'cloud', coveyRoomID: publicRoom.coveyRoomID });
      
      await apiClient.deleteRoom({ coveyRoomID: publicRoom.coveyRoomID, coveyRoomPassword: publicRoom.coveyRoomPassword });
      await expect(apiClient.joinRoom({ userName: 'snow', coveyRoomID: publicRoom.coveyRoomID })).rejects.toThrowError();   
    });
  });

  describe('CoveyRoomUpdateAPI', () => {
    it.each(ConfigureTest('CPU'))('Checks the password before updating any values [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);
      const publicRoomName = 'publicRoom1';
      const privateRoomName = 'privateRoom1';

      const publicRoom = await apiClient.createRoom({ friendlyName: publicRoomName, isPubliclyListed: true });
      const privateRoom = await apiClient.createRoom({ friendlyName: privateRoomName, isPubliclyListed: false });
      
      await expect(apiClient.updateRoom({ coveyRoomID: publicRoom.coveyRoomID, coveyRoomPassword: `Not ${publicRoom.coveyRoomPassword}`, friendlyName: 'publicRoom1', isPubliclyListed: false })).rejects.toThrowError();
      await expect(apiClient.updateRoom({ coveyRoomID: privateRoom.coveyRoomID, coveyRoomPassword: `Not ${privateRoom.coveyRoomPassword}`, friendlyName: 'privateRoom1', isPubliclyListed: true })).rejects.toThrowError();
      
      const roomList = await apiClient.listRooms();
      const roomListLength = roomList.rooms.length;
      expect(roomList.rooms[roomListLength - 1].friendlyName).toBe(publicRoomName);
    });
    it.each(ConfigureTest('UFV'))('Updates the friendlyName and visbility as requested [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);
      const privateRoomName = 'privateRoom1';
      const privateRoom = await apiClient.createRoom({ friendlyName: privateRoomName, isPubliclyListed: false });

      await apiClient.updateRoom({ coveyRoomID: privateRoom.coveyRoomID, coveyRoomPassword: privateRoom.coveyRoomPassword, isPubliclyListed: true });

      const roomList = await apiClient.listRooms();
      const roomListLength = roomList.rooms.length;      
      expect(roomList.rooms[roomListLength - 1].friendlyName).toBe('privateRoom1');

      await apiClient.updateRoom({ coveyRoomID: privateRoom.coveyRoomID, coveyRoomPassword: privateRoom.coveyRoomPassword, friendlyName: 'updatedToPublicRoom' });
      
      const updatedRoomList = await apiClient.listRooms();
      const updatedRoomListLength = updatedRoomList.rooms.length;      
      expect(updatedRoomList.rooms[updatedRoomListLength - 1].friendlyName).toBe('updatedToPublicRoom');

      await apiClient.updateRoom({ coveyRoomID: privateRoom.coveyRoomID, coveyRoomPassword: privateRoom.coveyRoomPassword, friendlyName: 'updatedToPrivateRoom', isPubliclyListed: false });
    });
    it.each(ConfigureTest('UFVU'))('Does not update the visibility if visibility is undefined [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);
      const publicRoomName = 'publicRoom1';
      const privateRoomName = 'privateRoom2';

      const publicRoom = await apiClient.createRoom({ friendlyName: publicRoomName, isPubliclyListed: true });
      await apiClient.updateRoom({ coveyRoomID: publicRoom.coveyRoomID, coveyRoomPassword: publicRoom.coveyRoomPassword, friendlyName: 'updatedPublicRoom1', isPubliclyListed: undefined });
      
      const roomList = await apiClient.listRooms();
      const roomListLength = roomList.rooms.length;      
      expect(roomList.rooms[roomListLength - 1].friendlyName).toBe('updatedPublicRoom1');
      
      const privateRoom = await apiClient.createRoom({ friendlyName: privateRoomName, isPubliclyListed: false });
      await apiClient.updateRoom({ coveyRoomID: privateRoom.coveyRoomID, coveyRoomPassword: privateRoom.coveyRoomPassword, friendlyName: 'updatedPrivateRoom1', isPubliclyListed: undefined });
      
      const updatedRoomList = await apiClient.listRooms();
      const updatedRoomListLength = updatedRoomList.rooms.length;      
      expect(updatedRoomList.rooms[updatedRoomListLength - 1].friendlyName).toBe('updatedPublicRoom1');
    });
  });

  describe('CoveyMemberAPI', () => {
    it.each(ConfigureTest('MNSR'))('Throws an error if the room does not exist [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);
      await expect(apiClient.joinRoom({ userName: 'cloud', coveyRoomID: 'Some Non Existent Room Haha' })).rejects.toThrowError();
    });
    it.each(ConfigureTest('MJPP'))('Admits a user to a valid public or private room [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);
      const publicRoom = await apiClient.createRoom({ friendlyName: 'publicRoom1', isPubliclyListed: true });
      await apiClient.joinRoom({ userName: 'Wamlab', coveyRoomID: publicRoom.coveyRoomID });
 
      const privateRoom = await apiClient.createRoom({ friendlyName: 'privateRoom1', isPubliclyListed: false });
      await apiClient.joinRoom({ userName: 'ays', coveyRoomID: privateRoom.coveyRoomID });
    });
  });
});
