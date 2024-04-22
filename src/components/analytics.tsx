import styled from "styled-components";

const Analytics = () => {
    return (
        <noscript>
            <IFrame src="https://www.googletagmanager.com/ns.html?id=GTM-NQX93QR4"/>
        </noscript>
    );
}

const IFrame = styled.iframe`
    display:none;
    visibility:hidden;
    height: 0px;
    width: 0px;
`;

export default Analytics;