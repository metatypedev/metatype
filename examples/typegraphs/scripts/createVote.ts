export async function handle(
  inp: { ideaId: string; authorEmail: string },
  _ctx: any,
  // the third paramter contains the gql client object
  { gql }: any,
) {
  const { data: { idea } } = await gql`
    query getIdeaAuthorEmail($ideaId: String!) {
      idea: i_get_idea(where: { id: $ideaId }) {
        authorEmail
      }
    }
  `.run({ ideaId: inp.ideaId });
  if (!idea) {
    throw new Error(`no idea found under id ${inp.ideaId}`);
  }
  if (inp.authorEmail == idea.authorEmail) {
    throw new Error(`author of idea can't vote for idea`);
  }

  const { data: { vote } } = await gql`
    mutation insertVote($ideaId: String!, $authorEmail: String!) {
      vote: i_create_vote(data: { 
          authorEmail: $authorEmail, 
          idea: { connect: { id: $ideaId } } 
      }) {
        id
      }
    }
  `.run(inp);
  return { voteId: vote.id };
}
