import usersData from "@/data/users.json";

export type UserRole = "learner" | "manager";

export type User = {
  id: string;
  name: string;
  role: UserRole;
  teamId: string;
};

export type UserRecord = User & { password: string };

export type Team = {
  id: string;
  name: string;
};

const rawUsers = usersData.users as UserRecord[];
const rawTeams = usersData.teams as Team[];

export const users: UserRecord[] = rawUsers;
export const teams: Team[] = rawTeams;

export const sanitizeUser = (user: UserRecord): User => ({
  id: user.id,
  name: user.name,
  role: user.role,
  teamId: user.teamId
});

export const authenticate = (username: string, password: string): User | null => {
  const match = rawUsers.find(
    (user) => user.id.toLowerCase() === username.toLowerCase() && user.password === password
  );
  return match ? sanitizeUser(match) : null;
};

export const getTeamById = (teamId: string) =>
  rawTeams.find((team) => team.id === teamId);

export const getUsersByTeam = (teamId: string): User[] =>
  rawUsers.filter((user) => user.teamId === teamId).map(sanitizeUser);
