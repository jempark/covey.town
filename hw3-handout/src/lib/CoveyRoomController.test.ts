import { mock, mockReset } from 'jest-mock-extended';
import { Socket } from 'socket.io';
import { nanoid } from 'nanoid';
import TwilioVideo from './TwilioVideo';
import CoveyRoomListener from '../types/CoveyRoomListener';
import CoveyRoomController from './CoveyRoomController';
import CoveyRoomsStore from './CoveyRoomsStore';
import Player from '../types/Player';
import { roomSubscriptionHandler } from '../requestHandlers/CoveyRoomRequestHandlers';
import * as TestUtils from '../TestUtils';
import { ConfigureTest, StartTest } from '../FaultManager';
import PlayerSession from '../types/PlayerSession';

// Set up a manual mock for the getTokenForRoom function in TwilioVideo
jest.mock('./TwilioVideo');
const mockGetTokenForRoom = jest.fn();
// eslint-disable-next-line
// @ts-ignore it's a mock
TwilioVideo.getInstance = () => ({
  getTokenForRoom: mockGetTokenForRoom,
});

describe('CoveyRoomController', () => {
  beforeEach(() => {
    // Reset any logged invocations of getTokenForRoom before each test
    mockGetTokenForRoom.mockClear();
  });
  it.each(ConfigureTest('CRCC'))('constructor should set the friendlyName property [%s]', (testConfiguration: string) => {
    StartTest(testConfiguration);
    const friendlyName = 'friendlyName1';
    const testController = new CoveyRoomController(friendlyName, true);
    expect(testController.friendlyName).toBe(friendlyName);
  });
  describe('addPlayer', () => {
    it.each(ConfigureTest('CRCAP'))('should use the coveyRoomID and player ID properties when requesting a video token [%s]',
      async (testConfiguration: string) => {
        StartTest(testConfiguration);
        const testController = new CoveyRoomController('friendlyName1', true);
        const testPlayer = new Player('cloud');

        await testController.addPlayer(testPlayer);
        expect(mockGetTokenForRoom).toBeCalledTimes(1);
        expect(mockGetTokenForRoom).toBeCalledWith(testController.coveyRoomID, testPlayer.id);
      });
  });
  describe('room listeners and events', () => {
    const mockListeners = [
      mock<CoveyRoomListener>(),
      mock<CoveyRoomListener>(),
      mock<CoveyRoomListener>(),
    ];
    let testController: CoveyRoomController;
    let testPlayer: Player; 
    beforeEach(() => {
      mockListeners.forEach(mockReset); 
      testController = new CoveyRoomController('friendlyName1', true);
      testPlayer = new Player('cloud'); 
      mockListeners.forEach(listener => testController.addRoomListener(listener));
    });
    it.each(ConfigureTest('RLEMV'))('should notify added listeners of player movement when updatePlayerLocation is called [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);
      await testController.addPlayer(testPlayer);
      
      testController.updatePlayerLocation(testPlayer, { x: 0, y: 0, rotation: 'left', moving: true });
      mockListeners.forEach(listener => { expect(listener.onPlayerMoved).toHaveBeenCalled(); });
    });
    it.each(ConfigureTest('RLEDC'))('should notify added listeners of player disconnections when destroySession is called [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);
      const testSession = await testController.addPlayer(testPlayer);
      
      testController.destroySession(testSession);
      mockListeners.forEach(listener => { expect(listener.onPlayerDisconnected).toHaveBeenCalled(); });
    });
    it.each(ConfigureTest('RLENP'))('should notify added listeners of new players when addPlayer is called [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);      
      await testController.addPlayer(testPlayer);
      mockListeners.forEach(listener => { expect(listener.onPlayerJoined).toHaveBeenCalled(); });
    });
    it.each(ConfigureTest('RLEDE'))('should notify added listeners that the room is destroyed when disconnectAllPlayers is called [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);
      await testController.addPlayer(testPlayer);
      testController.disconnectAllPlayers();

      mockListeners.forEach(listener => { expect(listener.onRoomDestroyed).toHaveBeenCalled(); });
    });
    it.each(ConfigureTest('RLEMVN'))('should not notify removed listeners of player movement when updatePlayerLocation is called [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);
      testController.removeRoomListener(mockListeners[2]);

      await testController.addPlayer(testPlayer);
      
      testController.updatePlayerLocation(testPlayer, { x: 0, y: 0, rotation: 'left', moving: true });
      expect(mockListeners[2].onPlayerMoved).toHaveBeenCalledTimes(0);
      expect(mockListeners[1].onPlayerMoved).toHaveBeenCalled();
      expect(mockListeners[0].onPlayerMoved).toHaveBeenCalled();
    });
    it.each(ConfigureTest('RLEDCN'))('should not notify removed listeners of player disconnections when destroySession is called [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);
      testController.removeRoomListener(mockListeners[2]);

      const testSession = await testController.addPlayer(testPlayer);
      
      testController.destroySession(testSession);
      expect(mockListeners[2].onPlayerDisconnected).toHaveBeenCalledTimes(0);
      expect(mockListeners[1].onPlayerDisconnected).toHaveBeenCalled();
      expect(mockListeners[0].onPlayerDisconnected).toHaveBeenCalled();
    });
    it.each(ConfigureTest('RLENPN'))('should not notify removed listeners of new players when addPlayer is called [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);
      testController.removeRoomListener(mockListeners[2]);

      await testController.addPlayer(testPlayer);

      expect(mockListeners[2].onPlayerJoined).toHaveBeenCalledTimes(0);
      expect(mockListeners[1].onPlayerJoined).toHaveBeenCalled();
      expect(mockListeners[0].onPlayerJoined).toHaveBeenCalled();
    });
    it.each(ConfigureTest('RLEDEN'))('should not notify removed listeners that the room is destroyed when disconnectAllPlayers is called [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);
      testController.removeRoomListener(mockListeners[2]);

      await testController.addPlayer(testPlayer);

      testController.disconnectAllPlayers();
      expect(mockListeners[2].onRoomDestroyed).toHaveBeenCalledTimes(0);
      expect(mockListeners[1].onRoomDestroyed).toHaveBeenCalled();
      expect(mockListeners[0].onRoomDestroyed).toHaveBeenCalled();
    });
  });
  describe('roomSubscriptionHandler', () => {
    /* Set up a mock socket, which you may find to be useful for testing the events that get sent back out to the client
    by the code in CoveyRoomController calling socket.emit.each(ConfigureTest(''))('event', payload) - if you pass the mock socket in place of
    a real socket, you can record the invocations of emit and check them.
     */
    const mockSocket = mock<Socket>();
    /*
    Due to an unfortunate design decision of Avery's, to test the units of CoveyRoomController
    that interact with the socket, we need to: 1. Get a CoveyRoomController from the CoveyRoomsStore, and then 2: call
    the roomSubscriptionHandler method. Ripley's provided some boilerplate code for you to make this a bit easier.
     */
    let testingRoom: CoveyRoomController;
    beforeEach(async () => {
      const roomName = `connectPlayerSocket tests ${nanoid()}`;
      // Create a new room to use for each test
      testingRoom = CoveyRoomsStore.getInstance().createRoom(roomName, false);
      // Reset the log on the mock socket
      mockReset(mockSocket);
    });
    it.each(ConfigureTest('SUBIDDC'))('should reject connections with invalid room IDs by calling disconnect [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);
      const connectedPlayer = new Player('cloud');
      const session = await testingRoom.addPlayer(connectedPlayer);
      TestUtils.setSessionTokenAndRoomID('', session.sessionToken, mockSocket);
      roomSubscriptionHandler(mockSocket);
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
    it.each(ConfigureTest('SUBKTDC'))('should reject connections with invalid session tokens by calling disconnect [%s]', async (testConfiguration: string) => {
      StartTest(testConfiguration);
      TestUtils.setSessionTokenAndRoomID(testingRoom.coveyRoomID, '', mockSocket);
      roomSubscriptionHandler(mockSocket);
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
    describe('with a valid session token', () => {
      /*
        Ripley says that you might find this helper code useful: it will create a valid session, configure the mock socket
        to identify itself with those tokens, and then calls the roomSubscriptionHandler on the mock socket.

        Your tests should perform operations on testingRoom, and make expectations about what happens to the mock socket.
       */
      let connectedPlayer: Player;
      let session: PlayerSession;
      beforeEach(async () => {
        connectedPlayer = new Player(`test player ${nanoid()}`);
        session = await testingRoom.addPlayer(connectedPlayer);
        TestUtils.setSessionTokenAndRoomID(testingRoom.coveyRoomID, session.sessionToken, mockSocket);
        roomSubscriptionHandler(mockSocket);
      });
      it.each(ConfigureTest('SUBNP'))('should add a room listener, which should emit "newPlayer" to the socket when a player joins [%s]', async (testConfiguration: string) => {
        StartTest(testConfiguration);
        const testPlayer = new Player('cloud');
        await testingRoom.addPlayer(testPlayer);
        expect(mockSocket.emit).toHaveBeenCalledWith('newPlayer', testPlayer);
      });
      it.each(ConfigureTest('SUBMV'))('should add a room listener, which should emit "playerMoved" to the socket when a player moves [%s]', async (testConfiguration: string) => {
        StartTest(testConfiguration);
        testingRoom.updatePlayerLocation(connectedPlayer, { x: 10, y: 10, rotation: 'back', moving: true });
        expect(mockSocket.emit).toHaveBeenCalledWith('playerMoved', connectedPlayer);
      });
      it.each(ConfigureTest('SUBDC'))('should add a room listener, which should emit "playerDisconnect" to the socket when a player disconnects [%s]', async (testConfiguration: string) => {
        StartTest(testConfiguration);
        testingRoom.destroySession(session);
        expect(mockSocket.emit).toHaveBeenCalledWith('playerDisconnect', connectedPlayer);
      });
      it.each(ConfigureTest('SUBRC'))('should add a room listener, which should emit "roomClosing" to the socket and disconnect it when disconnectAllPlayers is called [%s]', async (testConfiguration: string) => {
        StartTest(testConfiguration);
        testingRoom.disconnectAllPlayers();
        expect(mockSocket.emit).toHaveBeenCalledWith('roomClosing');
      });
      describe('when a socket disconnect event is fired', () => {
        it.each(ConfigureTest('SUBDCRL'))('should remove the room listener for that socket, and stop sending events to it [%s]', async (testConfiguration: string) => {
          StartTest(testConfiguration);
          expect(mockSocket.emit).toHaveBeenCalledTimes(0);
          const disconnectCall = mockSocket.on.mock.calls.find(item => item[0] === 'disconnect');
          if (disconnectCall) {
            disconnectCall[1]();
          } else {
            fail('this else statement should not be reached');
          }
          testingRoom.addPlayer(new Player('cloud'));
          expect(mockSocket.emit).toHaveBeenCalledTimes(0);
        });
        it.each(ConfigureTest('SUBDCSE'))('should destroy the session corresponding to that socket [%s]', async (testConfiguration: string) => {
          StartTest(testConfiguration);
          const mockRoomListener = mock<CoveyRoomListener>();
          testingRoom.addRoomListener(mockRoomListener);
          const disconnectCall = mockSocket.on.mock.calls.find(item => item[0] === 'disconnect');
          if (disconnectCall) {
            disconnectCall[1]();
          } else {
            fail('this else statement should not be reached');
          }
          expect(mockRoomListener.onPlayerDisconnected).toHaveBeenCalled();
        });
      });
      it.each(ConfigureTest('SUBMVL'))('should forward playerMovement events from the socket to subscribed listeners [%s]', async (testConfiguration: string) => {
        StartTest(testConfiguration);
        const mockRoomListener = mock<CoveyRoomListener>();
        testingRoom.addRoomListener(mockRoomListener);
        const playerMovementCall = mockSocket.on.mock.calls.find(item => item[0] === 'playerMovement');
        if (playerMovementCall) {
          playerMovementCall[1]();
        } else {
          fail('this else statement should not be reached');
        }
        expect(mockRoomListener.onPlayerMoved).toHaveBeenCalled();
      });
    });
  });
});
