/*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
chai.should();
const sinon = require('sinon');

const IdentityManagerFactory = require('../../lib/identity-management/IdentityManagerFactory');
const IdentityManager = require('../../lib/identity-management/IdentityManager');
const IWalletFacadeFactory = require('../../lib/identity-management/IWalletFacadeFactory');
const IWalletFacade = require('../../lib/identity-management/IWalletFacade');

const org1MSP = {
    mspid: 'org1MSP',
    identities: {
        credentialStore: {
            path: '/tmp/hfc-kvs/org1',
            cryptoStore: {
                path: '/tmp/hfc-cvs/org1'
            }
        },
        wallet: {
            path: 'some/path/to/org-specific-wallet'
        },
        certificates: [
            {
                alias: 'User1',
                clientPrivateKey: {
                    path: '../config/crypto-config/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore/key.pem'
                },
                clientSignedCert: {
                    path: '../config/crypto-config/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/signcerts/User1@org1.example.com-cert.pem..'
                }
            }
        ]
    },
    connectionProfile: {
        path: 'some/path/to/org-specific-profile',
        discover: true
    }
};

const org2MSP = {
    mspid: 'org2MSP',
    identities: {
        credentialStore: {
            path: '/tmp/hfc-kvs/org1',
            cryptoStore: {
                path: '/tmp/hfc-cvs/org1'
            }
        },
        wallet: {
            path: 'some/path/to/org-specific-wallet'
        },
        certificates: [
            {
                alias: 'User1',
                clientPrivateKey: {
                    path: '../config/crypto-config/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore/key.pem'
                },
                clientSignedCert: {
                    path: '../config/crypto-config/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/signcerts/User1@org1.example.com-cert.pem..'
                }
            }
        ]
    },
    connectionProfile: {
        path: 'some/path/to/org-specific-profile',
        discover: true
    }
};



describe('An Identity Manager', () => {

    describe('When being created by it\'s factory', () => {
        it('should return Identity Manager instance if an array of valid organizations are supplied', async () => {
            const stubWalletFacadeFactory = sinon.createStubInstance(IWalletFacadeFactory);
            const identityManagerFactory = new IdentityManagerFactory();
            const identityManager = await identityManagerFactory.create(stubWalletFacadeFactory, [org1MSP]);
            identityManager.should.be.instanceOf(IdentityManager);
        });

        it('should throw an error if no organizations are provided', async () => {
            const stubWalletFacadeFactory = sinon.createStubInstance(IWalletFacadeFactory);
            const identityManagerFactory = new IdentityManagerFactory();
            await identityManagerFactory.create(stubWalletFacadeFactory,[]).should.be.rejectedWith(/No organizations have been defined/);
            await identityManagerFactory.create(stubWalletFacadeFactory).should.be.rejectedWith(/No organizations have been defined/);
            await identityManagerFactory.create(stubWalletFacadeFactory, null).should.be.rejectedWith(/No organizations have been defined/);
        });

        it('should throw an error if first organization does not define an mspid', async () => {
            const stubWalletFacadeFactory = sinon.createStubInstance(IWalletFacadeFactory);
            const identityManagerFactory = new IdentityManagerFactory();
            const badOrg = JSON.parse(JSON.stringify(org2MSP));
            delete badOrg.mspid;
            await identityManagerFactory.create(stubWalletFacadeFactory,[badOrg]).should.be.rejectedWith(/No mspid has been defined for the first organization/);
        });

        it('should throw an error if a non default organization does not define an mspid', async () => {
            const stubWalletFacadeFactory = sinon.createStubInstance(IWalletFacadeFactory);
            const identityManagerFactory = new IdentityManagerFactory();
            const badOrg = JSON.parse(JSON.stringify(org2MSP));
            delete badOrg.mspid;
            await identityManagerFactory.create(stubWalletFacadeFactory,[org1MSP, badOrg]).should.be.rejectedWith(/At least 1 organization has not specified the mspid property/);
        });

        it('should throw an error if a non default organization has same mspid as default organization', async () => {
            const stubWalletFacadeFactory = sinon.createStubInstance(IWalletFacadeFactory);
            const identityManagerFactory = new IdentityManagerFactory();
            const badOrg = JSON.parse(JSON.stringify(org2MSP));
            badOrg.mspid = 'org1MSP';
            await identityManagerFactory.create(stubWalletFacadeFactory,[org1MSP, badOrg]).should.be.rejectedWith(/More than 1 organization with the same mspid is not allowed/);
        });
    });

    describe('when generating an alias name', () => {
        it('should not prefix for the default organisation', async () => {
            const stubWalletFacadeFactory = sinon.createStubInstance(IWalletFacadeFactory);
            const identityManagerFactory = new IdentityManagerFactory();
            const identityManager = await identityManagerFactory.create(stubWalletFacadeFactory, [org1MSP]);
            identityManager.getAliasNameFromOrganizationAndIdentityName('org1MSP', 'admin').should.equal('admin');

        });

        it('should prefix for the non default organisation', async () => {
            const stubWalletFacadeFactory = sinon.createStubInstance(IWalletFacadeFactory);
            const identityManagerFactory = new IdentityManagerFactory();
            const identityManager = await identityManagerFactory.create(stubWalletFacadeFactory, [org1MSP, org2MSP]);
            identityManager.getAliasNameFromOrganizationAndIdentityName('org2MSP', 'admin').should.equal('_org2MSP_admin');
        });
    });

    describe('when getting a list of alias names from an organisation', () => {
        it('should return the correct aliases for the default organisation', async () => {
            const stubWalletFacadeFactory = sinon.createStubInstance(IWalletFacadeFactory);
            const stubWalletFacade = sinon.createStubInstance(IWalletFacade);
            stubWalletFacadeFactory.create.resolves(stubWalletFacade);
            stubWalletFacade.getAllIdentityNames.resolves(['admin', 'user', '_org2MSP_admin', '_org2MSP_issuer']);
            const identityManagerFactory = new IdentityManagerFactory();
            const identityManager = await identityManagerFactory.create(stubWalletFacadeFactory, [org1MSP, org2MSP]);
            await identityManager.getAliasNamesForOrganization('org1MSP').should.eventually.deep.equal(['admin', 'user']);
        });

        it('should return the correct aliases for a non default organisation', async () => {
            const stubWalletFacadeFactory = sinon.createStubInstance(IWalletFacadeFactory);
            const stubWalletFacade = sinon.createStubInstance(IWalletFacade);
            stubWalletFacadeFactory.create.resolves(stubWalletFacade);
            stubWalletFacade.getAllIdentityNames.resolves(['admin', 'user', '_org2MSP_admin', '_org2MSP_issuer']);
            const identityManagerFactory = new IdentityManagerFactory();
            const identityManager = await identityManagerFactory.create(stubWalletFacadeFactory, [org1MSP, org2MSP]);
            await identityManager.getAliasNamesForOrganization('org2MSP').should.eventually.deep.equal(['_org2MSP_admin', '_org2MSP_issuer']);
        });

        it('should return the an empty array if there are no aliases for the organization', async () => {
            const stubWalletFacadeFactory = sinon.createStubInstance(IWalletFacadeFactory);
            const stubWalletFacade = sinon.createStubInstance(IWalletFacade);
            stubWalletFacadeFactory.create.resolves(stubWalletFacade);
            stubWalletFacade.getAllIdentityNames.resolves(['admin', 'user', '_org2MSP_admin', '_org2MSP_issuer']);
            const identityManagerFactory = new IdentityManagerFactory();
            const identityManager = await identityManagerFactory.create(stubWalletFacadeFactory, [org1MSP, org2MSP]);
            await identityManager.getAliasNamesForOrganization('org3MSP').should.eventually.deep.equal([]);
        });
    });

    it('should return a wallet when requested', async () => {
        const stubWalletFacadeFactory = sinon.createStubInstance(IWalletFacadeFactory);
        const stubWalletFacade = sinon.createStubInstance(IWalletFacade);
        stubWalletFacadeFactory.create.resolves(stubWalletFacade);
        stubWalletFacade.getWallet.returns('IamAwallet');
        const identityManagerFactory = new IdentityManagerFactory();
        const identityManager = await identityManagerFactory.create(stubWalletFacadeFactory, [org1MSP, org2MSP]);
        await identityManager.getWallet().should.equal('IamAwallet');
    });

    describe ('when extracting identities from a fabric node sdk 1.4 credential store and store in the in memory wallet', () => {
        it('store the path and the cryptostore path in the memory wallet', async () => {
            const stubWalletFacadeFactory = sinon.createStubInstance(IWalletFacadeFactory);
            const stubWalletFacade = sinon.createStubInstance(IWalletFacade);
            stubWalletFacadeFactory.create.resolves(stubWalletFacade);
            const identityManagerFactory = new IdentityManagerFactory();
            const identityManager = await identityManagerFactory.create(stubWalletFacadeFactory, [org1MSP, org2MSP]);
            // should i fake run the parse org from the identity manager? no maybe initalise tho?
            // should create memory wallet beforehand? it starts as null
            const credentialStore = {
                path: 'path/to/somewhere',
                cryptostore: {
                    path: 'path/to/somewhere/else'
                },
            };
            // await identityManager._extractIdentitiesFromCredentialStore(credentialStore);
            // should be fake?
            // need to check it calls export, calls it once, calls it with mspid + credential store.path + credentialstore.cyrptostore.path
            identityManager._extractIdentitiesFromCredentialStore(credentialStore);
        });
        // presuming different tests for v1 v2 very unsure how to write, just focusing on v1 now and hopefully? shouldn't be that different when writing test?
        // v1 might need admin name for credentialstore
        //
        // tests to add properly
        // credential store optional, might not exist need test for that but should throw error if they are calling function
        // defined in connection profile as well/optionally? probably shouldn't matter in this case
    });

    describe ('blah', () => {
        it('should', async () => {
            const stubWalletFacadeFactory = sinon.createStubInstance(IWalletFacadeFactory);
            const stubWalletFacade = sinon.createStubInstance(IWalletFacade);
            stubWalletFacadeFactory.create.resolves(stubWalletFacade);
            const identityManagerFactory = new IdentityManagerFactory();
            const identityManager = await identityManagerFactory.create(stubWalletFacadeFactory, [org1MSP, org2MSP]);
            const wallet = {
                path: 'some/path/to/org-specific-wallet'
            };
            // should be await and checking what
            // needs to check it calls export, once, mspid + wallet.path
            // need to check correct mspid? don't think i can here
            identityManager._extractIdentitiesFromWallet(wallet);
        });

    });
});
