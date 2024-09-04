HIGH VIEW BREAKDOWN:
User opens the app
User signs in 
User accesses homepage (sidebar, projects manager interface)
Selects project o creates a new one. If new title and description
Enters specific project interface
Press create image inpainng button
Make iterations and retrieve final output. Set name and description
Enters specific project interface
...


# TODO

ROUTINE PROYECTION:

day 1:
- [X] Finish user sign up cloud function (init user into database and update id token to add data)

day 2 to 3:
- [X] Integrate stripe

days 4 to 7:
- [ ] Create basic interface tu purchase subscription and add logics to subscribe
- [ ] Test plan renewal background method
- [ ] Code interface and methods to create projects, generations, runs. Store usage, activity, billing.

days 7 to 10:
- [ ] Integrate Dream Brush

day 11:
- [ ] Finish institutional site

day 12:
- [ ] Start alpha


Optionals before MVP:
- [ ] Add logics to register, forgot password


DAY 2 to 3 - BREAKDOWN:
New user goes to plan selector page / Subscribed user accessed upgrade section
User selects plan
By that: 
    client - Sends plan id
    api - maps to price id
    api - Triggers stripe unsubscription if already subscribed
    api - Triggers stripe subscription
    stripe - calls webhook
    api - Webhook updates subscription, activity, usage and updates tokenId?
    client- reloads tokenId
    -- subscription process finished