import { Client } from 'pg';

const client = new Client({
  connectionString:
    'postgres://kisvchxzkztlyx:02c7828881c5e71290f509916361926b80923b88c0dddeaf170cb111cdbb4c51@ec2-18-204-101-137.compute-1.amazonaws.com:5432/d46idgb6list1r',
  ssl: {
    rejectUnauthorized: false,
  },
});

// makes a connection to the database and maintains it until the program ends
client.connect();

export type JoinedTown = {
  townID: string;
  positionX: number;
  positionY: number;
};

export type UserInfo = {
  userID: string;
  username?: string;
  userEmail?: string;
  useAudio?: boolean;
  useVideo?: boolean;
  towns?: JoinedTown[];
};

/**
 * Checks to see if the given TownList contains the town ID
 */
function containsTownID(joinedTownList: JoinedTown[], town: JoinedTown): boolean {
  let result = false;
  joinedTownList.forEach(t => {
    if (town.townID === t.townID) {
      result = true;
    }
  });
  return result;
}

/**
 * checks if a town exists with a user already joined, if so, updates the town info, otherwise adds to the town info list
 * RETURN type: {success: true/false}
 */
export async function upsertTowns(userInfo: UserInfo): Promise<boolean> {
  try {
    const requestedTowns = userInfo.towns;

    let existingTowns: JoinedTown[] = [];
    const toInsert: JoinedTown[] = [];
    const toUpdate: JoinedTown[] = [];

    const townQuery = {
      name: 'get-town',
      text: 'SELECT town_id, position_x, position_y from towns WHERE user_id=$1',
      values: [userInfo.userID],
    };
    const res = await client.query(townQuery);

    existingTowns = res.rows.map((row: any) => ({
      townID: row.town_id,
      positionX: row.position_x,
      positionY: row.position_y,
    }));

    requestedTowns?.forEach(town => {
      if (containsTownID(existingTowns, town)) {
        toUpdate.push(town);
      } else {
        toInsert.push(town);
      }
    });

    if (toInsert.length > 0) {
      toInsert.forEach(async town => {
        const query = {
          name: 'insert-table',
          text:
            'INSERT INTO towns (town_id, user_id, position_x, position_y) VALUES ($1, $2, $3, $4)',
          values: [town.townID, userInfo.userID, town.positionX, town.positionY],
        };

        await client.query(query);
      });
    }

    if (toUpdate.length > 0) {
      toUpdate.forEach(async town => {
        const query = {
          name: 'update-table',
          text:
            'UPDATE towns SET position_x=COALESCE($1, position_x), position_y=COALESCE($2, position_y) WHERE user_id = $3 AND town_id = $4',
          values: [town.positionX, town.positionY, userInfo.userID, town.townID],
        };

        client.query(query);
      });
    }
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * checks if a user already exists, if so, updates their account, otherwise creates a new user
 * RETURN type: {success: true/false}
 */
export async function upsertUser(userInfo: UserInfo): Promise<boolean> {
  try {
    const userIdQueryResult = await client.query(
      `SELECT user_id FROM user_preferences WHERE user_id = '${userInfo.userID}';`,
    );

    if (userIdQueryResult.rows.length > 0) {
      const query = {
        name: 'update-user',
        text:
          'UPDATE user_preferences SET username=COALESCE($1, username), email=COALESCE($2, email), use_audio=COALESCE($3, use_audio), use_video=COALESCE($4, use_video) WHERE user_id = $5',
        values: [
          userInfo.username,
          userInfo.userEmail,
          userInfo.useAudio,
          userInfo.useVideo,
          userInfo.userID,
        ],
      };

      await client.query(query);
    } else {
      const query = {
        name: 'insert-user',
        text:
          'INSERT INTO user_preferences (user_id, username, email, use_audio, use_video) VALUES ($1, $2, $3, $4, $5)',
        values: [
          userInfo.userID,
          userInfo.username,
          userInfo.userEmail,
          userInfo.useAudio,
          userInfo.useVideo,
        ],
      };
      await client.query(query);
    }
  } catch (err) {
    return false;
  }

  return upsertTowns(userInfo);
}

/**
 * gets user info given a user_id
 * RETURN type: AccountTypes.User interface
 */
export async function getUserByID(userID: string): Promise<UserInfo | undefined> {
  try {
    const query = {
      name: 'GetUserByID',
      text: `SELECT up.user_id,
                    up.email,
                    up.username,
                    up.use_audio,
                    up.use_video,
                    t.town_id,
                    t.position_x,
                    t.position_y
              FROM user_preferences up
              LEFT JOIN towns t ON up.user_id = t.user_id
              WHERE up.user_id = $1`,
      values: [userID],
    };

    let user: UserInfo | undefined;
    const response = await client.query(query);
    response.rows.forEach((row: any) => {
      if (user === undefined) {
        user = {
          userID: row.user_id,
          userEmail: row.email,
          username: row.username,
          useAudio: row.use_audio,
          useVideo: row.use_video,
          towns: [],
        };
      }

      if (row.town_id) {
        user.towns?.push({
          townID: row.town_id,
          positionX: row.position_x,
          positionY: row.position_y,
        });
      }
    });

    return user;
  } catch (err) {
    return undefined;
  }
}

/**
 * deletes a user, specified by their email
 * RETURN type: {success: true/false}
 */
export async function deleteUser(userID: string): Promise<boolean> {
  try {
    await client.query(`DELETE FROM towns WHERE user_id = '${userID}';`);
    await client.query(`DELETE FROM user_preferences WHERE user_id = '${userID}';`);

    return true;
  } catch (err) {
    return false;
  }
}
