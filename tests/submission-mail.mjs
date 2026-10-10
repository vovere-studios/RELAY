import assert from 'node:assert/strict';
import { sendSubmissionConfirmation } from '../src/lib/submission-mail.server.ts';
const calls=[];
const originalFetch=globalThis.fetch;
try {
 globalThis.fetch=async(_url,options)=>{calls.push({body:JSON.parse(options.body),headers:options.headers});return Response.json({success:true});};
 const delivery={receipt:'guest-fixture',sender:'Example <sender>',receiver:'Example & receiver',sender_email:'sender@example.invalid',recipient_emails:['receiver@example.invalid'],count:2,guest:true};
 assert.equal(await sendSubmissionConfirmation(delivery,'test-key'),'sent');
 assert.equal(calls.length,2);assert.equal(calls[0].body.to,'sender@example.invalid');assert.equal(calls[1].body.to,'receiver@example.invalid');
 assert.ok(calls[1].body.html.includes('Example &lt;sender&gt;'));assert.ok(calls[0].body.html.includes('Example &amp; receiver'));
 assert.ok(!calls[0].body.text.includes('Your originals stay'));assert.ok(!calls[0].body.text.includes('#token='));
 assert.equal(calls[0].body.from,'RELAY <noreply@relay.vovere-studios.com>');
 const keys=calls.map(c=>c.headers['Idempotency-Key']);calls.length=0;
 await sendSubmissionConfirmation(delivery,'test-key');assert.deepEqual(calls.map(c=>c.headers['Idempotency-Key']),keys);
 globalThis.fetch=async()=>Response.json({success:false});assert.equal(await sendSubmissionConfirmation(delivery,'test-key'),'failed');
 globalThis.fetch=async()=>{throw new Error('Network unavailable');};assert.equal(await sendSubmissionConfirmation(delivery,'test-key'),'failed');
 console.log('Submission email: recipients, escaping, guest copy, retry keys and provider failures passed. No real mail sent.');
}finally{globalThis.fetch=originalFetch;}
