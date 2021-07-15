import React, { useEffect, useState } from 'react';

import {
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import MenuItem from '@material-ui/core/MenuItem';
import Typography from '@material-ui/core/Typography';
import useCoveyAppState from '../../hooks/useCoveyAppState';

const TownSettings: React.FunctionComponent = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    apiClient,
    currentTownID,
    currentTownFriendlyName,
    currentTownIsPubliclyListed,
  } = useCoveyAppState();
  const [friendlyTownName, setFriendlyTownName] = useState<string>('');
  const [townUpdatePassword, setTownUpdatePassword] = useState<string>('');
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const toast = useToast();

  useEffect(() => {
    setFriendlyTownName(currentTownFriendlyName);
    setIsPublic(currentTownIsPubliclyListed);
  }, [currentTownFriendlyName, currentTownIsPubliclyListed]);

  const processUpdates = async () => {
    try {
      await apiClient.updateTown({
        coveyTownID: currentTownID,
        friendlyName: friendlyTownName,
        coveyTownPassword: townUpdatePassword,
        isPubliclyListed: isPublic,
      });

      toast({
        title: 'Town updated',
        description: 'To see the updated town, please exit and re-join this town',
        status: 'success',
      });

      onClose();
    } catch (err) {
      toast({
        title: 'Unable to update town',
        description: err.toString(),
        status: 'error',
      });
    }
  };

  const processDeletes = async () => {
    try {
      await apiClient.deleteTown({
        coveyTownID: currentTownID,
        coveyTownPassword: townUpdatePassword,
      });

      toast({
        title: 'Town deleted',
        status: 'success',
      });

      onClose();
    } catch (err) {
      toast({
        title: 'Unable to delete town',
        description: err.toString(),
        status: 'error',
      });
    }
  };

  return (
    <>
      <MenuItem data-testid='openMenuButton' onClick={onOpen}>
        <Typography variant='body1'>Town Settings</Typography>
      </MenuItem>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Edit town {currentTownFriendlyName} ({currentTownID})
          </ModalHeader>
          <ModalCloseButton />
          <form
            onSubmit={ev => {
              ev.preventDefault();
              processUpdates();
            }}>
            <ModalBody pb={6}>
              <FormControl>
                <FormLabel htmlFor='friendlyName'>Friendly Name</FormLabel>
                <Input
                  id='friendlyName'
                  name='friendlyName'
                  value={friendlyTownName}
                  onChange={event => setFriendlyTownName(event.target.value)}
                />
              </FormControl>

              <FormControl mt={4}>
                <FormLabel htmlFor='isPubliclyListed'>Publicly Listed</FormLabel>
                <Checkbox
                  id='isPubliclyListed'
                  name='isPubliclyListed'
                  isChecked={isPublic}
                  onChange={() => setIsPublic(!isPublic)}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel htmlFor='updatePassword'>Town Update Password</FormLabel>
                <Input
                  data-testid='updatePassword'
                  id='updatePassword'
                  name='password'
                  type='password'
                  onChange={event => setTownUpdatePassword(event.target.value)}
                />
              </FormControl>
            </ModalBody>

            <ModalFooter>
              <Button
                data-testid='deletebutton'
                colorScheme='red'
                mr={3}
                value='delete'
                onClick={() => processDeletes()}>
                Delete
              </Button>
              <Button
                data-testid='updatebutton'
                colorScheme='blue'
                type='submit'
                mr={3}
                value='update'>
                onClick={() => processUpdates()}
                Update
              </Button>
              <Button onClick={onClose}>Cancel</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
};

export default TownSettings;
