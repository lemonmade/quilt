import {AbortError} from '@quilted/events';
import prompts, {type PromptObject, type PromptType} from 'prompts';

export interface CustomPromptReturnTypes {
  confirm: boolean;
  toggle: boolean;
  number: number;
  date: Date;
  multiselect: string[];
  autocompleteMultiselect: string[];
}

export async function prompt<Prompt extends PromptType = PromptType>(
  prompt: Omit<PromptObject<'value'>, 'name'> & {type: Prompt},
): Promise<
  Prompt extends keyof CustomPromptReturnTypes
    ? CustomPromptReturnTypes[Prompt]
    : string
> {
  const result = await prompts<'value'>(
    {name: 'value', ...prompt},
    {
      onCancel() {
        throw new AbortError();
      },
    },
  );

  return result.value as any;
}
