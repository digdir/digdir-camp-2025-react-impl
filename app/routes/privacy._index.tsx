import { Card, Details, List, Paragraph } from '@digdir/designsystemet-react';
import { Link } from 'react-router';

import HeadingWrapper from '~/components/util/HeadingWrapper';

export default function Privacy() {
    return (
        <div className="grid grid-cols-12 gap-6 py-6">
            <div className="col-span-12 grid grid-cols gap-6">
                <HeadingWrapper id="personvaernerklaering" level={2} heading="Personvernerklæring" translate={false}/>
                <Paragraph> I personvernerklæringa kan du lese om korleis Digitaliseringsdirektoratet samlar inn og brukar informasjon om deg når du besøker nettstaden vår, og kva rettar du har
                    overfor oss som behandlingsansvarleg. </Paragraph>
                <Paragraph> Denne personvernerklæringa gjeld for: https://sjolvbetjening.samarbeid.digdir.no | Sjølvbetjening </Paragraph>
            </div>

            <Details className="col-span-12 rounded-lg border-none bg-white">
                <Details.Summary className="rounded-lg bg-white hover:bg-accent-light">
                    På denne sida
                </Details.Summary>
                <Details.Content>
                    <List.Unordered style={{ listStyle: 'none', padding: 0 }}>
                        <List.Item>
                            <Link className="text-neutral" to={'#personvaernerklaering'}> Personvernerklæring </Link>
                            <List.Unordered className="space-y-4 py-4" style={{ listStyle: 'none' }}>
                                <List.Item>
                                    <Link className="text-neutral" to={'#sentrale-omgraep'}> Sentrale omgrep </Link>
                                </List.Item>
                                <List.Item>
                                    <Link className="text-neutral" to={'#kva-for-personopplysningar-behandlar-vi'}> Kva for personopplysningar behandlar vi, og kvifor? </Link>
                                    <List.Unordered className="space-y-4 pt-4" style={{ listStyle: 'none' }}>
                                        <List.Item>
                                            <Link className="text-neutral" to={'#ip-adresse-og-loggar'}> IP-adresse og loggar </Link>
                                        </List.Item>
                                        <List.Item>
                                            <Link className="text-neutral" to={'#informasjonskapslar'}> Informasjonskapslar </Link>
                                        </List.Item>
                                        <List.Item>
                                            <Link className="text-neutral" to={'#databehandlarar-og-tredjepartar'}> Databehandlarar og tredjepartar </Link>
                                        </List.Item>
                                        <List.Item>
                                            <Link className="text-neutral" to={'#dine-rettar'}> Dine rettar </Link>
                                        </List.Item>
                                    </List.Unordered>
                                </List.Item>
                                <List.Item>
                                    <Link className="text-neutral" to={'#kontaktinformasjon'}> Kontaktinformasjon </Link>
                                </List.Item>
                                <List.Item>
                                    <Link className="text-neutral" to={'#informasjonssikkerheit'}> Informasjonssikkerheit </Link>
                                </List.Item>
                            </List.Unordered>
                        </List.Item>
                    </List.Unordered>
                </Details.Content>
            </Details>

            <Card className="col-span-12 rounded-lg border-none space-y-6 bg-white">
                <HeadingWrapper id="sentrale-omgraep" level={3} heading="Sentrale omgrep" translate={false}/>
                <List.Unordered>
                    <List.Item>
                        <Paragraph> <b> Personvern </b>er eit lovpålagt vern av privatliv og personleg integritet, og omfattar retten til innflytelse over korleis data om deg brukast og blir spreidd.
                            Dette er regulert gjennom EU si personvernforordning (GDPR - General Data Protection Regulation) </Paragraph>
                    </List.Item>
                    <List.Item>
                        <Paragraph> <b> Personopplysningar </b>er informasjon som kan knyttast til deg som person, som namn, fødselsnummer, telefonnummer, IP-adresse og bilete. <b>Sensitive
                            personopplysningar</b> kan til dømes vere religiøse eller politiske oppfatningar, legning eller helseforhold. </Paragraph>
                    </List.Item>
                    <List.Item>
                        <Paragraph> Når det blir samla, registrert, strukturert, lagra eller delt data om deg, reknast det som ei <b>behandling</b>.For at det skal vere lovleg å behandle data, er det
                            nødvendig med <b>behandlingsgrunnlag</b>, jf. personvernforordninga art. 6. Vidare skal personopplysningar berre behandlast for spesifikke, uttrykkelege, angitte og
                            legitime <b>føremål</b>. </Paragraph>
                    </List.Item>
                    <List.Item>
                        <Paragraph> <b>Behandlingsansvarleg</b> er verksemda som er ansvarleg for behandling av personopplysningane, mens ein <b>databehandlar</b> behandlar opplysningar på oppdrag frå
                            den som er behandlingsansvarleg. Ein <b>databehandlaravtale</b> er ein avtale mellom behandlingsansvarleg og databehandlar om korleis personopplysningane skal
                            behandlast. <b>Tredjepartar</b> er tenesteleverandørar som behandlar personopplysningar på eigne vegner. </Paragraph>
                    </List.Item>
                </List.Unordered>
            </Card>

            <div className="col-span-12 grid grid-cols gap-6">
                <HeadingWrapper id={'kva-for-personopplysningar-behandlar-vi'} level={3} translate={false} heading="Kva for personopplysningar behandlar vi, og kvifor?"/>
                <Paragraph> Følgande personopplysningar vert behandla i sjølvbetjeningsløysinga: </Paragraph>
                <List.Unordered>
                    <List.Item>
                        <Paragraph> Fødselsnummer </Paragraph>
                    </List.Item>
                    <List.Item>
                        <Paragraph> Tilknyting til verksemd </Paragraph>
                    </List.Item>
                    <List.Item>
                        <Paragraph> IP-adresse </Paragraph>
                    </List.Item>
                </List.Unordered>
                <Paragraph> Personopplysningane vert behandla på denne måten i sjølvbetjeningsløysinga: </Paragraph>
                <List.Unordered>
                    <List.Item>
                        <Paragraph> Fødselsnummer vert nytta for autentisere sluttbrukar </Paragraph>
                    </List.Item>
                    <List.Item>
                        <Paragraph> Tilknyting til verksemd vert nytta for å sikre at sluttbrukar har rettigheit til å administrere klientar på vegne av verksemda </Paragraph>
                    </List.Item>
                    <List.Item>
                        <Paragraph> Statistikk for å forbetre og utvikle sjølvbetjeningsløysinga </Paragraph>
                    </List.Item>
                    <List.Item>
                        <Paragraph> Logging: Vi lagrar opplysingar om kven som har utført endringar på kunden sin klient. Dette vil mellom anna nyttast til å vise endringshistorikk. </Paragraph>
                    </List.Item>
                </List.Unordered>
                <Paragraph> Kjelder for innhenting av personopplysningar: </Paragraph>

                <List.Unordered>
                    <List.Item className="space-y-4">
                        <Paragraph> Ansattporten </Paragraph>
                        <List.Unordered>
                            <List.Item>
                                Utlevering av fødselsnummer på innlogga brukar
                            </List.Item>
                            <List.Item>
                                Utlevering av tilknyting til verksemd på innlogga brukar
                            </List.Item>
                        </List.Unordered>
                    </List.Item>
                </List.Unordered>

                <HeadingWrapper id="ip-adresse-og-loggar" heading="IP-adresse og loggar" translate={false} level={4}/>
                <Paragraph> IP-adresse og user-agent vert logga i 1 år for handlingar utført av sluttbrukar. Dette vert sletta automatisk ved loggrotering. </Paragraph>

                <HeadingWrapper id="informasjonskapslar" heading="Informasjonskapslar" translate={false} level={4}/>
                <Paragraph> Sjølvbetjeningsløysinga lagrar ein øktbasert informasjonskapsel. Denne vert sletta automatisk når nettleserøkta vert avslutta. </Paragraph>
                <Paragraph> I tillegg nyttar vi SiteImprove med <Link to={'https://help.siteimprove.com/support/solutions/articles/80001088752-cookieless-tracking'}> cookieless tracking </Link> for
                    webanalyse og statistikk om besøk til nettstaden. </Paragraph>

                <HeadingWrapper id="databehandlarar-og-tredjepartar" heading="Databehandlarar og tredjepartar" translate={false} level={4}/>
                <Paragraph> Digdir brukar <Link to={'https://www.siteimprove.com/privacy/'}>Siteimprove</Link> til webanalyse og statistikk om besøk til nettstaden. </Paragraph>

                <HeadingWrapper id="dine-rettar" heading="Dine rettar" translate={false} level={4}/>
                <Paragraph> Alle som spør, har rett på grunnleggande informasjon om korleis ei verksemd behandlar personopplysningar. Dersom du er registrert i eit av systema til
                    Digitaliseringsdirektoratet, har du rett på innsyn i dine eigne personopplysningar. Du kan også be om retting eller sletting av mangelfulle eller uriktige opplysningar. Kravet ditt
                    vil bli behandla kostnadsfritt og seinast innan 30 dagar. </Paragraph>
                <Paragraph> Alle førespurnader om innsyn i og rettar knytta til personopplysningar kan rettast til vårt personvernombod på e-post. </Paragraph>
                <Paragraph> Dersom du ønsker å klage på vår behandling av personopplysningar, har du rett
                    å <Link to={'https://www.datatilsynet.no/om-datatilsynet/kontakt-oss/klage-til-datatilsynet/'}>klage til Datatilsynet</Link>. </Paragraph>

                <HeadingWrapper id={'kontaktinformasjon'} heading="Kontaktinformasjon" translate={false} level={3}/>
                <Paragraph> Sidan Digitaliseringsdirektoratet er ei offentleg myndigheit, har vi eit eige personvernombod i verksemda. Du kan lese meir
                    om <Link to={'https://www.digdir.no/digdir/personvernombod-i-digitaliseringsdirektoratet/944'}> hva personvernombodet er og korleis du kan kome i kontakt med vedkomande </Link> på
                    ombodet si eiga side. </Paragraph>

                <HeadingWrapper id="informasjonssikkerheit" heading="Informasjonssikkerheit" translate={false} level={4}/>
                <Paragraph> Digitaliseringsdirektoratet har tekniske og organisatoriske tiltak på plass for å hindre at personopplysningar kjem på avvege, kan endrast ugrunna eller blir
                    utilgjengelege. </Paragraph>
            </div>
        </div>
    )
}