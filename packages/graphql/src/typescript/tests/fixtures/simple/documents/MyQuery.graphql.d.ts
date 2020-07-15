export interface MyQueryData {
  readonly me: MyQueryData.Me;
  readonly family: MyQueryData.FamilyPerson | MyQueryData.FamilyPet | MyQueryData.FamilyOther;
}

export namespace MyQueryData {
  export interface Me {
    readonly __typename: 'Person';
    readonly name: string;
    readonly occupation: string | null;
  }

  export interface FamilyPerson {
    __typename: 'Person';
    name: string;
  }

  export interface FamilyPet {
    __typename: 'Pet';
    legs: number;
  }

  export interface FamilyOther {
    __typename: '';
  }
}
