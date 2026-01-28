import { handleLabelsSubmit } from '../../polls/createPoll.js';

export function handleModal(body, res) {
    return handleLabelsSubmit(body, res);
}
