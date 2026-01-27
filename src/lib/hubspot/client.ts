interface HubSpotContact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    company?: string;
    jobtitle?: string;
    phone?: string;
    hs_object_id?: string;
    [key: string]: any;
  };
}

interface HubSpotContactsResponse {
  results: HubSpotContact[];
  paging?: {
    next?: {
      after: string;
    };
  };
}

export interface HubSpotContactMapped {
  hubspotId: string;
  name: string;
  email: string;
  firm: string | null;
  title: string | null;
  phone: string | null;
}

export async function fetchHubSpotContacts(apiKey: string): Promise<HubSpotContactMapped[]> {
  const contacts: HubSpotContactMapped[] = [];
  let after: string | undefined;

  do {
    const url = new URL("https://api.hubapi.com/crm/v3/objects/contacts");
    url.searchParams.set("limit", "100");
    url.searchParams.set("properties", "firstname,lastname,email,company,jobtitle,phone");
    
    if (after) {
      url.searchParams.set("after", after);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HubSpot API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: HubSpotContactsResponse = await response.json();

    // Map HubSpot contacts to our format
    for (const contact of data.results) {
      const props = contact.properties;
      const email = props.email;
      
      // Skip contacts without email
      if (!email) continue;

      const firstName = props.firstname || "";
      const lastName = props.lastname || "";
      const name = `${firstName} ${lastName}`.trim() || email;

      contacts.push({
        hubspotId: contact.id,
        name,
        email,
        firm: props.company || null,
        title: props.jobtitle || null,
        phone: props.phone || null,
      });
    }

    // Check if there are more pages
    after = data.paging?.next?.after;
  } while (after);

  return contacts;
}

export async function testHubSpotConnection(apiKey: string): Promise<boolean> {
  try {
    const url = new URL("https://api.hubapi.com/crm/v3/objects/contacts");
    url.searchParams.set("limit", "1");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}



