export interface IProfileBasicInfo {
  name: string;
  email: string;
  phone: string;
}

export interface IProfileWorkInfo {
  company: string;
  linkedinLink: string;
  githubLink: string;
}

export interface IProfileData {
  basic: IProfileBasicInfo;
  work: IProfileWorkInfo;
  interests: string[];
}
