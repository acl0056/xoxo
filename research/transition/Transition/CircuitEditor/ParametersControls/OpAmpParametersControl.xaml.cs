using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Commands;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The User Control item template is documented at https://go.microsoft.com/fwlink/?LinkId=234236

namespace Easycoustics.Transition.CircuitEditor.ParametersControls
{
    public sealed partial class OpAmpParametersControl : UserControl
    {
        private string oldElementName;

        private OpAmp SerializableOpAmp { get; }

        public OpAmpParametersControl()
        {
            this.InitializeComponent();
        }

        public OpAmpParametersControl(OpAmp opamp)
        {
            this.InitializeComponent();

            SerializableOpAmp = opamp;
            opamp.PropertyChanged += handleChangeOfControls;

            handleChangeOfControls(null, null);
        }

        private void handleChangeOfControls(object sender, PropertyChangedEventArgs e)
        {
            txtDCGain.Text = SerializableOpAmp.DcGain.ToString();
            txtDescription.Text = SerializableOpAmp.Description;
            txtElementName.Text = SerializableOpAmp.ElementName;
            txtGainBandwidth.Text = SerializableOpAmp.GainBandwidth.ToString();
            txtModelName.Text = SerializableOpAmp.ModelName;
            txtPhaseMargin.Text = SerializableOpAmp.PhaseMargin.ToString();
            txtRIn.Text = SerializableOpAmp.RIn.ToString();
            txtROut.Text = SerializableOpAmp.ROut.ToString();
            
        }

        private void ElementNameFocus(object sender, RoutedEventArgs e)
        {
            oldElementName = SerializableOpAmp.ElementName;
        }

      
        private void ElementNameChanged(object sender, TextChangedEventArgs e)
        {
            if (oldElementName == txtElementName.Text) return;

            var command = new CommandSetValue()
            {
                Component = SerializableOpAmp,
                Property = "ElementName",
                OldValue = oldElementName,
                NewValue = txtElementName.Text
            };

            executeCommand(command);

            oldElementName = txtElementName.Text;
        }

        private void executeCommand(ICircuitCommand command)
        {
            CircuitEditor.currentInstance.executeCommand(command);
        }

        private void btnLibrary(object sender, TappedRoutedEventArgs e)
        {

        }
    }
}
