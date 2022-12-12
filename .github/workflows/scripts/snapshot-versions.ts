import {setFailed} from '@actions/core';
import {context, getOctokit} from '@actions/github';

try {
  await run();
} catch (err) {
  setFailed(`Request failed with error ${err}`);
}

async function run() {
  console.log(context.repo);
  console.log(context.payload.comment);

  const {graphql} = getOctokit(process.env.GITHUB_TOKEN!);

  console.log(await graphql('query { viewer { login } }'));

  const reaction = await graphql(
    `
      mutation AddReaction($subjectId: ID!) {
        addReaction(input: {subjectId: $subjectId, content: EYES}) {
          reaction {
            content
            reactable {
              ... on IssueComment {
                url
              }
            }
          }
        }
      }
    `,
    {
      subjectId: context.payload.comment!.node_id,
    },
  );

  console.log(JSON.stringify(reaction, null, 2));

  const repositoryDetails = await graphql(
    `
      query RepositoryDetails(
        $owner: String!
        $repo: String!
        $username: String!
      ) {
        repository(owner: $owner, name: $repo) {
          collaborators(first: 1, query: $username) {
            edges {
              permission
            }
          }
        }
      }
    `,
    {
      owner: context.repo.owner,
      repo: context.repo.repo,
      username: context.actor,
    },
  );

  console.log(JSON.stringify(repositoryDetails, null, 2));

  // const actorPermission = (
  //   await github.rest.repos.getCollaboratorPermissionLevel({
  //     ...context.repo,
  //     username: context.actor,
  //   })
  // ).data.permission;
  // const isPermitted = ['write', 'admin'].includes(actorPermission);
  // if (!isPermitted) {
  //   const errorMessage =
  //     'Only users with write permission to the respository can run /snapit';
  //   await github.rest.issues.createComment({
  //     ...context.repo,
  //     issue_number: context.issue.number,
  //     body: errorMessage,
  //   });
  //   core.setFailed(errorMessage);
  //   return;
  // }
  // const pullRequest = await github.rest.pulls.get({
  //   ...context.repo,
  //   pull_number: context.issue.number,
  // });
  // // Pull request from fork
  // if (
  //   context.payload.repository.full_name !==
  //   pullRequest.data.head.repo.full_name
  // ) {
  //   const errorMessage =
  //     '`/snapit` is not supported on pull requests from forked repositories.';
  //   await github.rest.issues.createComment({
  //     ...context.repo,
  //     issue_number: context.issue.number,
  //     body: errorMessage,
  //   });
  //   core.setFailed(errorMessage);
  // }
}

export {};
